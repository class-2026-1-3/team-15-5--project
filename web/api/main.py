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

@app.get("/spec")
def specs(id: int, pr_name: str):
    connection = get_db_connection()
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT * FROM server_spec WHERE id = %s AND pr_name = %s", (id, pr_name))
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

@app.get("/billings")
def get_billings(user_id: int):
    connection = get_db_connection()
    try:
        with connection.cursor() as cur:
            # 먼저 해당 사용자의 빌링 데이터 개수 조회
            cur.execute("SELECT COUNT(*) as cnt FROM billing WHERE user_id = %s", (user_id,))
            cnt = cur.fetchone()["cnt"]
            
            # 빌링 데이터가 없으면 과거 3달치 더미 데이터 인서트
            if cnt == 0:
                # 사용자의 인스턴스 ID 조회
                cur.execute("SELECT id FROM instance WHERE user_id = %s LIMIT 1", (user_id,))
                inst = cur.fetchone()
                inst_id = inst["id"] if inst else None
                
                # 인스턴스가 없을 경우 임의 생성
                if not inst_id:
                    # server_spec 조회
                    cur.execute("SELECT id FROM server_spec LIMIT 1")
                    spec = cur.fetchone()
                    spec_id = spec["id"] if spec else 1
                    
                    # 더미 인스턴스 인서트
                    cur.execute("""
                        INSERT INTO instance (user_id, server_id, instance_name, ip_address, status)
                        VALUES (%s, %s, 'Demo Web Server', '192.168.75.10', 3)
                    """, (user_id, spec_id))
                    connection.commit()
                    inst_id = cur.lastrowid
                
                import datetime
                now = datetime.datetime.now()
                # 3달치 더미 데이터 인서트
                for i in range(3):
                    # i=0: 이번 달(진행중 PENDING), i=1: 지난 달(PAID), i=2: 지지난 달(PAID)
                    month_start = (now - datetime.timedelta(days=30 * (i + 1))).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    month_end = (month_start + datetime.timedelta(days=30)).replace(hour=23, minute=59, second=59)
                    pay_time = month_end + datetime.timedelta(days=1)
                    
                    amount = round(15.45 * (3 - i), 2)
                    status = 2 if i > 0 else 1  # 2: PAID, 1: PENDING
                    
                    cur.execute("""
                        INSERT INTO billing (user_id, instance_id, amount, start_at, end_at, status, pay_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (user_id, inst_id, amount, month_start, month_end, status, pay_time if status == 2 else None))
                connection.commit()
            
            # 전체 빌링 내역 조회 (인스턴스명 조인)
            cur.execute("""
                SELECT b.id, b.user_id, b.instance_id, b.amount, b.start_at, b.end_at, b.status, b.pay_at, i.instance_name
                FROM billing b
                LEFT JOIN instance i ON b.instance_id = i.id
                WHERE b.user_id = %s
                ORDER BY b.start_at DESC
            """, (user_id,))
            billings = cur.fetchall()
            for bill in billings:
                for key in ["start_at", "end_at", "pay_at"]:
                    if bill.get(key):
                        bill[key] = bill[key].strftime("%Y-%m-%d %H:%M:%S")
            return {"success": True, "billings": billings}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",port=6974, reload=True)