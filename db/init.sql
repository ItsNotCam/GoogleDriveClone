CREATE DATABASE IF NOT EXISTS GDRIVEDB;
USE GDRIVEDB;

CREATE TABLE USER (
  ID CHAR(36) DEFAULT(uuid()) PRIMARY KEY,
  USERNAME VARCHAR(32) UNIQUE NOT NULL,
  PASSWORD VARCHAR(64) NOT NULL,
  CREATED DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);


CREATE TABLE FILE (
  ID CHAR(36) DEFAULT(uuid()) PRIMARY KEY,

  NAME VARCHAR(64) NOT NULL,
  EXTENSION VARCHAR(64) NOT NULL,
  FILENAME VARCHAR(128) NOT NULL,
  DESCRIPTION TEXT,

  INTERNAL_FILE_PATH TEXT NOT NULL,
  SIZE_BYTES FLOAT NOT NULL,

  UPLOAD_TIME DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  LAST_DOWNLOAD_TIME DATETIME,
  LAST_DOWNLOAD_USER_ID CHAR(36),

  FOREIGN KEY (LAST_DOWNLOAD_USER_ID) REFERENCES USER(ID)
);

CREATE TABLE COMMENT (
  FILE_ID CHAR(36) NOT NULL,
  USER_ID CHAR(36) NOT NULL,
  COMMENT TEXT NOT NULL,

  FOREIGN KEY (FILE_ID) REFERENCES FILE(ID),
  FOREIGN KEY (USER_ID) REFERENCES USER(ID),

  PRIMARY KEY (FILE_ID, USER_ID)
);

CREATE TABLE OWNERSHIP (
  USER_ID CHAR(36),
  FILE_ID CHAR(36),
  PARENT_FOLDER_ID CHAR(36),
  IS_OWNER BIT(1) DEFAULT 0,

  FOREIGN KEY (USER_ID) REFERENCES USER(ID),
  FOREIGN KEY (FILE_ID) REFERENCES FILE(ID),

  PRIMARY KEY (USER_ID, FILE_ID)
);