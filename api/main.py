from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from pymongo import MongoClient
from bson.binary import Binary
from io import BytesIO
import os
import datetime
import base64

# Настройки
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "avto_web_db")
COLLECTION = "license_plates"

# Инициализация DB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
coll = db[COLLECTION]

app = FastAPI()

# Статика и шаблон
app.mount("/static", StaticFiles(directory="../static"), name="static")

# CORS (если фронт хостится отдельно)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Простая главная страница (отдаёт шаблон)
@app.get("/", response_class=HTMLResponse)
async def index():
    with open("../templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# API: сохранить запись (photo + plate)
@app.post("/api/save")
async def save_record(plate: str = Form(...), file: UploadFile = File(...)):
    plate_norm = " ".join(plate.strip().upper().split())
    # Валидация простая — можно расширить по regex
    if len(plate_norm) < 3:
        raise HTTPException(status_code=400, detail="Invalid plate")

    content = await file.read()
    record = {
        "license_plate": plate_norm,
        "photo_data": Binary(content),
        "filename": file.filename,
        "content_type": file.content_type,
        "created_at": datetime.datetime.utcnow()
    }
    res = coll.insert_one(record)
    return {"ok": True, "id": str(res.inserted_id)}

# API: поиск по номеру — возвращаем список фото (base64) + мета
@app.get("/api/search")
async def search(plate: str):
    plate_norm = " ".join(plate.strip().upper().split())
    docs = list(coll.find({"license_plate": plate_norm}).sort("created_at", -1))
    if not docs:
        return JSONResponse({"ok": True, "results": []})
    results = []
    for d in docs:
        b = bytes(d["photo_data"])
        b64 = base64.b64encode(b).decode("utf-8")
        results.append({
            "id": str(d["_id"]),
            "plate": d["license_plate"],
            "filename": d.get("filename"),
            "content_type": d.get("content_type", "image/jpeg"),
            "created_at": d.get("created_at").isoformat(),
            "image_base64": f"data:{d.get('content_type','image/jpeg')};base64,{b64}"
        })
    return {"ok": True, "results": results}

# API: список всех номеров (уникальные)
@app.get("/api/list")
async def list_plates():
    plates = coll.distinct("license_plate")
    return {"ok": True, "plates": plates}

# API: health
@app.get("/api/health")
async def health():
    try:
        client.admin.command("ping")
        return {"ok": True, "db": DB_NAME}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)
