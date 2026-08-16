import os
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = "uploads"

@router.post("/")
def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
        
        return {"url": f"http://localhost:8000/uploads/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))