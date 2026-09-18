import os
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter(prefix="/upload", tags=["Upload"])

# Configuration Cloudinary à partir des variables d'environnement définies sur Render
# (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


@router.post("/")
def upload_file(file: UploadFile = File(...)):
    try:
        # resource_type="auto" : Cloudinary détecte lui-même s'il s'agit d'une
        # image, d'une vidéo ou d'un autre type de fichier (pdf, doc, etc.).
        result = cloudinary.uploader.upload(
            file.file,
            resource_type="auto",
            folder="club-anglais-uploads",
        )
        # "secure_url" est une URL permanente et publique (https://res.cloudinary.com/...)
        # qui survit à tous les redéploiements du backend.
        return {"url": result["secure_url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))