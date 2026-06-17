SET NAMES utf8mb4;

CREATE TABLE user
(
  user_id    INTEGER     NOT NULL AUTO_INCREMENT COMMENT '고유 식별자',
  username   VARCHAR(64) NOT NULL UNIQUE COMMENT 'Login ID',
  password   VARCHAR(64) NOT NULL COMMENT 'SHA-256으로 해싱된 PW',
  role       VARCHAR(10) NULL     DEFAULT 'USER' COMMENT '권한',
  status     TINYINT     NULL     DEFAULT 1 COMMENT '1 : ACTIVE, 2 : INACTIVE, 3: BANNED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  PRIMARY KEY (user_id)
);

CREATE TABLE server_spec
(
  id         INTEGER     NOT NULL AUTO_INCREMENT COMMENT '서버 고유 ID',
  name       VARCHAR(50) NULL     DEFAULT 'Linux server' COMMENT '서버의 이름',
  pr_name    VARCHAR(50) NULL     DEFAULT 'Intel® Xeon® Gold 6544Y' COMMENT '프로세서 이름',
  pr_core    INTEGER     NULL     DEFAULT 16 COMMENT '프로세서 코어 수',
  ram_gb     INTEGER     NOT NULL DEFAULT 16 COMMENT '메모리 용량',
  storage_gb INTEGER     NOT NULL DEFAULT 128 COMMENT '저장장치 용량',
  cost       FLOAT       NULL     DEFAULT 0.0 COMMENT '시간당 비용($)',
  PRIMARY KEY (id)
);

CREATE TABLE instance
(
  id            INTEGER     NOT NULL AUTO_INCREMENT COMMENT '인스턴스의 고유 ID',
  user_id       INTEGER     NOT NULL COMMENT '고유 식별자',
  server_id     INTEGER     NOT NULL COMMENT '서버 고유 ID',
  instance_name VARCHAR(30) NULL     DEFAULT 'My Server' COMMENT '인스턴스의 이름',
  ip_address    VARCHAR(40) NOT NULL DEFAULT '192.168.75.1' COMMENT 'IP 주소',
  status        TINYINT     NOT NULL DEFAULT 0 COMMENT '0 : Down 1 : Up 2 : Stop 3 : Terminated',
  created_at    DATETIME    NULL     DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user (user_id),
  FOREIGN KEY (server_id) REFERENCES server_spec (id)
);

CREATE TABLE billing
(
  id          INTEGER  NOT NULL AUTO_INCREMENT COMMENT '결제 id',
  user_id     INTEGER  NOT NULL COMMENT '고유 식별자',
  instance_id INTEGER  NOT NULL COMMENT '인스턴스의 고유 ID',
  amount      FLOAT    NOT NULL DEFAULT 0.0 COMMENT '청구 금액($)',
  start_at    DATETIME NULL     COMMENT '인스턴스 산정 시작 시점',
  end_at      DATETIME NULL     COMMENT '인스턴스 산정 종료 시점',
  status      TINYINT  NOT NULL DEFAULT 1 COMMENT '0 : FAIL 1 : PENDING 2 : PAID',
  pay_at      DATETIME NULL     COMMENT '결제 일시',
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES user (user_id),
  FOREIGN KEY (instance_id) REFERENCES instance (id)
);

INSERT INTO user (username, password, role, status) VALUES ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'ADMIN', 1), -- admin
('satellite4245', '2d13fc8d186f85ad818817d856068ce6c0c500c1d4e4dbf7b72e725f701e6a70', 'USER', 1), -- hanstar1009.
('shit', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'USER', 2), -- 1234
('junior', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'USER', 3); -- 1234

INSERT INTO server_spec (name, pr_name, pr_core, ram_gb, storage_gb, cost) VALUES
('t2.nano', 'Intel® Xeon® E5-2676 v3', 1, 1, 8, 0.0058),
('t2.micro', 'Intel® Xeon® E5-2676 v3', 1, 1, 8, 0.0116),
('t2.small', 'Intel® Xeon® E5-2676 v3', 1, 2, 20, 0.0230),
('t2.medium', 'Intel® Xeon® E5-2676 v3', 2, 4, 40, 0.0464),
('m5.large', 'Intel® Xeon® Platinum 8175', 2, 8, 100, 0.0960),
('c5.xlarge', 'Intel® Xeon® Platinum 8275L', 4, 8, 200, 0.1700),
('r5.2xlarge', 'Intel® Xeon® Platinum 8175M', 8, 64, 500, 0.5040),
('p3.2xlarge (GPU)', 'NVIDIA® Tesla® V100', 8, 61, 1000, 3.0600),
('Raspberry Pi® 4B (Edge)', 'Broadcom BCM2711 SoC', 4, 4, 32, 0.0050),
('c5.4xlarge', 'Intel® Xeon® Gold 6544Y', 16, 32, 1024, 1),
('c193.large', 'AMD EPYC™ 9754', 32, 256, 1024, 3.5),
('c323.2xlarge', 'AMD EPYC™ 9709', 32, 256, 1024, 3.5);
