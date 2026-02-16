import sqlite3
from datetime import datetime

class PacketDatabase:
    def __init__(self, db_name="packets.db"):
        self.db_name = db_name
        self.conn = None
        self.cursor = None
        self.init_db()
    
    def init_db(self):
        """Initialize database and create table if it doesn't exist"""
        self.conn = sqlite3.connect(self.db_name)
        self.cursor = self.conn.cursor()
        
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS packets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                src_ip TEXT,
                dst_ip TEXT,
                src_port INTEGER,
                dst_port INTEGER,
                protocol TEXT
            )
        ''')
        self.conn.commit()
    
    def insert_metadata(self, metadata):
        """Insert packet metadata into database"""
        self.cursor.execute('''
            INSERT INTO packets (src_ip, dst_ip, src_port, dst_port, protocol)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            metadata['src_ip'],
            metadata['dst_ip'],
            metadata['src_port'],
            metadata['dst_port'],
            metadata['protocol']
        ))
        self.conn.commit()
    
    def get_all_packets(self):
        """Retrieve all packets from database"""
        self.cursor.execute('SELECT * FROM packets')
        return self.cursor.fetchall()
    
    def close(self):
        """Close database connection"""
        self.conn.close()