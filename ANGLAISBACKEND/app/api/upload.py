import os
from fastapi import APIRouter, File, UploadFile, HTTPException, Request

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = "uploads"


@router.post("/")
def upload_file(request: Request, file: UploadFile = File(...)):
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
        # Construit l'URL à partir de la requête reçue (localhost en dev, domaine Render en prod)
        base_url = str(request.base_url).rstrip("/")
        return {"url": f"{base_url}/uploads/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))