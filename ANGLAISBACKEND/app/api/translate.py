import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, status

load_dotenv()

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "").strip()

router = APIRouter(prefix="/translate", tags=["Traduction"])

# Cache mémoire simple (text, target) -> traduction.
# Réinitialisé au redémarrage ; borné pour ne pas grossir indéfiniment.
_translation_cache: dict[tuple[str, str], str] = {}
_CACHE_MAX = 5000


def _cache_set(key: tuple[str, str], value: str) -> None:
    if len(_translation_cache) >= _CACHE_MAX:
        _translation_cache.pop(next(iter(_translation_cache)))  # supprime la plus ancienne
    _translation_cache[key] = value


# ----------------------------------------------------------------------------
# Détection de langue (pour target=auto)
# ----------------------------------------------------------------------------

_FR_HINTS = {
    "le", "la", "les", "un", "une", "des", "du", "et", "est", "je", "tu", "il", "elle", "nous", "vous",
    "ils", "pas", "que", "qui", "pour", "avec", "dans", "sur", "ça", "ca", "va", "oui", "non", "bonjour",
    "salut", "merci", "comment", "mais", "ou", "où", "au", "aux", "ce", "cette", "mon", "ma", "mes",
    "suis", "es", "sommes", "êtes", "sont", "fait", "très", "bien", "aussi", "demain", "aujourd'hui",
}
_EN_HINTS = {
    "the", "a", "an", "and", "is", "are", "am", "i", "you", "he", "she", "we", "they", "not", "that",
    "for", "with", "in", "on", "it", "yes", "no", "hello", "hi", "thanks", "thank", "how", "but", "or",
    "this", "my", "your", "was", "were", "have", "has", "do", "does", "very", "also", "tomorrow", "today",
    "good", "morning", "evening", "everyone", "what", "where", "when", "please", "english", "can", "will", "to", "of",
}


def _guess_lang_local(text: str) -> str:
    """Heuristique de secours ('fr' ou 'en'). Par défaut 'fr' (plateforme francophone)."""
    words = re.findall(r"[a-zà-ÿ']+", text.lower())
    fr = sum(1 for w in words if w in _FR_HINTS)
    en = sum(1 for w in words if w in _EN_HINTS)
    if re.search(r"[éèêàâçùûôîï]", text.lower()):
        fr += 2
    return "en" if en > fr else "fr"


def _detect_lang_google(text: str) -> str:
    query = urllib.parse.urlencode({"client": "gtx", "sl": "auto", "tl": "en", "dt": "t", "q": text})
    req = urllib.request.Request(
        f"https://translate.googleapis.com/translate_a/single?{query}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        data = json.loads(response.read().decode("utf-8"))
    return str(data[2]).lower()  # code de la langue source détectée


def _resolve_target(text: str) -> str:
    """Retourne 'en' si le texte est en français, sinon 'fr'."""
    try:
        detected = _detect_lang_google(text)
    except Exception as e:
        print(f"[translate] détection Google échouée ({type(e).__name__}) -> heuristique locale")
        detected = _guess_lang_local(text)
    return "en" if detected.startswith("fr") else "fr"


# ----------------------------------------------------------------------------
# Fournisseurs
# ----------------------------------------------------------------------------

def _call_deepl(text: str, target: str) -> str:
    if not DEEPL_API_KEY:
        raise RuntimeError("DEEPL_API_KEY absente du fichier .env")

    # Les clés du plan gratuit se terminent par ':fx' et utilisent un sous-domaine dédié
    is_free_key = DEEPL_API_KEY.endswith(":fx")
    base_url = "https://api-free.deepl.com/v2/translate" if is_free_key else "https://api.deepl.com/v2/translate"

    data = urllib.parse.urlencode({
        "text": text,
        "target_lang": "EN-GB" if target == "en" else "FR",
    }).encode("utf-8")

    req = urllib.request.Request(base_url, data=data, method="POST")
    req.add_header("Authorization", f"DeepL-Auth-Key {DEEPL_API_KEY}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib.request.urlopen(req, timeout=8) as response:
        result = json.loads(response.read().decode("utf-8"))
    return result["translations"][0]["text"]


def _call_google(text: str, target: str) -> str:
    query = urllib.parse.urlencode({"client": "gtx", "sl": "auto", "tl": target, "dt": "t", "q": text})
    req = urllib.request.Request(
        f"https://translate.googleapis.com/translate_a/single?{query}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=6) as response:
        data = json.loads(response.read().decode("utf-8"))
    return "".join(chunk[0] for chunk in data[0])


def _call_mymemory(text: str, target: str) -> str:
    source = "fr" if target == "en" else "en"
    query = urllib.parse.urlencode({"q": text, "langpair": f"{source}|{target}"})
    req = urllib.request.Request(
        f"https://api.mymemory.translated.net/get?{query}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=6) as response:
        data = json.loads(response.read().decode("utf-8"))
    translated = data.get("responseData", {}).get("translatedText", "")
    if not translated or "MYMEMORY WARNING" in translated.upper():
        raise ValueError("Réponse MyMemory invalide ou quota dépassé")
    return translated


# ----------------------------------------------------------------------------
# Route
# ----------------------------------------------------------------------------

@router.get("")
@router.get("/")
def translate_text(
    text: str = Query(..., min_length=1, max_length=1000),
    target: str = Query(...),
):
    # Validation manuelle (compatible avec toutes les versions de FastAPI/Pydantic).
    target = (target or "").strip().lower()
    if target not in ("en", "fr", "auto"):
        raise HTTPException(status_code=422, detail="Le paramètre 'target' doit être 'en', 'fr' ou 'auto'.")

    text = text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Texte vide.")

    # 'auto' : on traduit vers l'autre langue du couple FR/EN (le frontend envoie target=auto)
    auto_key = (text, "auto")
    if target == "auto":
        if auto_key in _translation_cache:
            return {"translatedText": _translation_cache[auto_key], "provider": "cache"}
        target = _resolve_target(text)
        is_auto = True
    else:
        is_auto = False

    cache_key = (text, target)
    if cache_key in _translation_cache:
        result = _translation_cache[cache_key]
        if is_auto:
            _cache_set(auto_key, result)
        return {"translatedText": result, "provider": "cache"}

    providers = (("deepl", _call_deepl), ("google", _call_google), ("mymemory", _call_mymemory))
    for name, fn in providers:
        try:
            translated = fn(text, target)
            _cache_set(cache_key, translated)
            if is_auto:
                _cache_set(auto_key, translated)
            return {"translatedText": translated, "provider": name}
        except Exception as e:
            print(f"[translate] {name} a échoué : {type(e).__name__}: {e}")

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Traduction indisponible pour le moment (les trois services sont hors service ou en quota). Réessaie dans quelques minutes.",
    )