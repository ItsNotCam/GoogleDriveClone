from dotenv import load_dotenv
import os

from flask import Flask
from flask_restful import Api, Resource

import mysql.connector


load_dotenv()
TABLES = []
try:
  cnx = mysql.connector.connect(
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    host=os.getenv("DB_HOST"),
    database=os.getenv("MYSQL_ROOT_DATABASE"),
    port=os.getenv("DB_PORT")
  )

  with cnx.cursor() as cursor:
    res = cursor.execute("SHOW TABLES")
    for r in cursor.fetchall():
      TABLES.append(r[0])

    cnx.close()
except mysql.connector.Error as err:
  print("Something went wrong: {}".format(err))

app = Flask(__name__)
api = Api(app)

class Tables(Resource):
  def get(self):
    return { 'tables': TABLES }

class TestConnection(Resource):    
  def get(self):
    return { "success": "good its working"}

api.add_resource(Tables, '/api/db/tables')
api.add_resource(TestConnection, '/api/test')

host = os.getenv("API_HOST")
if __name__ == '__main__':
  app.run(debug=True, host=host, port=os.getenv("API_PORT"))