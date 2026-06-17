import os
import pymysql
import hashlib
import random
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
        charset='utf8mb4',
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

class CreateInstanceRequest(BaseModel):
    user_id: int
    server_id: int
    instance_name: str

class UpdateStatusRequest(BaseModel):
    status: int

@app.get("/specs")
def get_all_specs():
    connection = get_db_connection()
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT * FROM server_spec")
            specs = cur.fetchall()
            return {"success": True, "specs": specs}
    finally:
        connection.close()

@app.get("/instances")
def get_instances(user_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor() as cur:
            cur.execute("""
                SELECT i.id, i.instance_name, i.ip_address, i.status, i.created_at, 
                       s.name AS server_name, s.pr_name, s.pr_core, s.ram_gb, s.storage_gb, s.cost
                FROM instance i
                JOIN server_spec s ON i.server_id = s.id
                WHERE i.user_id = %s AND i.status != 3
                ORDER BY i.created_at DESC
            """, (user_id,))
            instances = cur.fetchall()
            for inst in instances:
                if inst.get("created_at"):
                    inst["created_at"] = inst["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            return {"success": True, "instances": instances}
    finally:
        connection.close()

@app.post("/instances")
def create_instance(data: CreateInstanceRequest):
    connection = get_db_connection()
    try:
        ip_address = f"192.168.75.{random.randint(2, 254)}"
        with connection.cursor() as cur:
            cur.execute("""
                INSERT INTO instance (user_id, server_id, instance_name, ip_address, status)
                VALUES (%s, %s, %s, %s, 1)
            """, (data.user_id, data.server_id, data.instance_name, ip_address))
            connection.commit()
            return {"success": True, "message": "Instance created successfully"}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()

@app.post("/instances/{instance_id}/status")
def update_instance_status(instance_id: int, data: UpdateStatusRequest):
    connection = get_db_connection()
    try:
        with connection.cursor() as cur:
            cur.execute("UPDATE instance SET status = %s WHERE id = %s", (data.status, instance_id))
            connection.commit()
            return {"success": True, "message": "Instance status updated successfully"}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",port=6974, reload=True)