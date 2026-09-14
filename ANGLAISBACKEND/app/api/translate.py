import json
import os
import urllib.error
import urllib.parse
import urllib.request

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, status

load_dotenv()

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "").strip()

router = APIRouter(prefix="/translate", tags=["Traduction"])

# Cache mémoire simple (text, target) -> traduction.
# Réinitialisé au redémarrage du serveur ; suffisant pour éviter de re-solliciter
# les APIs à chaque fois qu'un visiteur relit le même post/message.
_translation_cache: dict[tuple[str, str], str] = {}


def _call_deepl(text: str, target: str) -> str:
    if not DEEPL_API_KEY:
        raise RuntimeError("DEEPL_API_KEY absente du fichier .env")

    # Les clés du plan gratuit se terminent par ':fx' et utilisent un sous-domaine dédié
    is_free_key = DEEPL_API_KEY.endswith(":fx")
    base_url = "https://api-free.deepl.com/v2/translate" if is_free_key else "https://api.deepl.com/v2/translate"

    target_lang = "EN-GB" if target == "en" else "FR"

    data = urllib.parse.urlencode({
        "text": text,
        "target_lang": target_lang,
    }).encode("utf-8")

    req = urllib.request.Request(base_url, data=data, method="POST")
    req.add_header("Authorization", f"DeepL-Auth-Key {DEEPL_API_KEY}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib.request.urlopen(req, timeout=8) as response:
        result = json.loads(response.read().decode("utf-8"))

    return result["translations"][0]["text"]


def _call_google(text: str, target: str) -> str:
    query = urllib.parse.urlencode({
        "client": "gtx",
        "sl": "auto",
        "tl": target,
        "dt": "t",
        "q": text,
    })
    url = f"https://translate.googleapis.com/translate_a/single?{query}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=6) as response:
        data = json.loads(response.read().decode("utf-8"))
    return "".join(chunk[0] for chunk in data[0])


def _call_mymemory(text: str, target: str) -> str:
    source = "fr" if target == "en" else "en"
    query = urllib.parse.urlencode({
        "q": text,
        "langpair": f"{source}|{target}",
    })
    url = f"https://api.mymemory.translated.net/get?{query}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=6) as response:
        data = json.loads(response.read().decode("utf-8"))
    translated = data.get("responseData", {}).get("translatedText", "")
    if not translated or "MYMEMORY WARNING" in translated.upper():
        raise ValueError("Réponse MyMemory invalide ou quota dépassé")
    return translated


@router.get("")
@router.get("/")
def translate_text(
    text: str = Query(..., min_length=1, max_length=1000),
    target: str = Query(...),
):
    # Validation manuelle plutôt que Query(..., pattern=...) : le paramètre
    # "pattern" n'existe pas sur toutes les versions de FastAPI/Pydantic
    # (avant, c'était "regex") et peut faire planter l'import du routeur au
    # démarrage, ce qui expliquerait que /translate ne réponde jamais.
    target = (target or "").strip().lower()
    if target not in ("en", "fr"):
        raise HTTPException(status_code=422, detail="Le paramètre 'target' doit être 'en' ou 'fr'.")

    cache_key = (text, target)
    if cache_key in _translation_cache:
        return {"translatedText": _translation_cache[cache_key], "provider": "cache"}

    # 1er essai : DeepL (meilleure qualité, quota mensuel dédié via clé API)
    try:
        translated = _call_deepl(text, target)
        _translation_cache[cache_key] = translated
        return {"translatedText": translated, "provider": "deepl"}
    except Exception as e:
        print(f"[translate] DeepL a échoué : {type(e).__name__}: {e}")

    # 2e essai : Google (gratuit, sans clé, mais quota partagé par IP)
    try:
        translated = _call_google(text, target)
        _translation_cache[cache_key] = translated
        return {"translatedText": translated, "provider": "google"}
    except Exception as e:
        print(f"[translate] Google a échoué : {type(e).__name__}: {e}")

    # 3e essai : MyMemory, dernier filet de sécurité
    try:
        translated = _call_mymemory(text, target)
        _translation_cache[cache_key] = translated
        return {"translatedText": translated, "provider": "mymemory"}
    except Exception as e:
        print(f"[translate] MyMemory a échoué : {type(e).__name__}: {e}")

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Traduction indisponible pour le moment (les trois services sont hors service ou en quota). Réessaie dans quelques minutes.",
    )