from database import db
from datetime import datetime

class Study(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    study_uid = db.Column(db.String(64), unique=True, nullable=False)
    patient_name = db.Column(db.String(100))
    study_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    series = db.relationship('Series', backref='study', lazy=True)

class Series(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    series_uid = db.Column(db.String(64), unique=True, nullable=False)
    series_number = db.Column(db.Integer)
    modality = db.Column(db.String(20))
    study_id = db.Column(db.Integer, db.ForeignKey('study.id'), nullable=False)
    instances = db.relationship('Instance', backref='series', lazy=True)

class Instance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    instance_uid = db.Column(db.String(64), unique=True, nullable=False)
    instance_number = db.Column(db.Integer)
    image_path = db.Column(db.String(500))
    series_id = db.Column(db.Integer, db.ForeignKey('series.id'), nullable=False)
    annotations = db.relationship('Annotation', backref='instance', lazy=True)

class Annotation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shape_type = db.Column(db.String(20), nullable=False)  # rectangle, circle, ellipse
    coordinates = db.Column(db.JSON, nullable=False)  # 存储坐标数据
    label = db.Column(db.String(100))
    instance_id = db.Column(db.Integer, db.ForeignKey('instance.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
