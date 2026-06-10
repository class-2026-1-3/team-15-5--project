import os
import pymysql
import hashlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    db_host = os.getenv("DB_HOST", "localhost")
    return pymysql.connect(
        host=db_host,
        user='root',
        password='password',
        database='busomago_ec2',
        cursorclass=pymysql.cursors.DictCursor
    )

class LoginRequest(BaseModel):
    username:str
    password:str

@app.post("/login")
def login(data: LoginRequest):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            hashed_password = hashlib.sha256(data.password.encode('utf-8')).hexdigest()
            cursor.execute("SELECT * FROM user WHERE username = %s AND password = %s", (data.username, hashed_password))
            user = cursor.fetchone()
            if user:
                return {"success": True, "message": "Login successful", "user_id": user["user_id"]}
            else:
                raise HTTPException(status_code=401, detail="Invalid username or password")
    finally:
        connection.close()

class SpecRequest(BaseModel):
    id:int
    pr_name:str

@app.get("/spec")
def specs(data: SpecRequest):
    connection = get_db_connection()
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT * FROM server_spec WHERE id = %s AND pr_name = %s", (data.id, data.pr_name))
            spec = cur.fetchone()
            if spec:
                return {"success":True,"spec":spec}
            else:
                raise HTTPException(status_code=404, detail="Spec not found")
    finally:
        connection.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",port=6974, reload=True)