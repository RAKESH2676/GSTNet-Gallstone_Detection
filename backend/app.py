import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from backend.config import Config, UPLOAD_FOLDER, REPORTS_FOLDER
from database.db_manager import init_db
from model.gstnet_model import build_gstnet_model, HAS_TENSORFLOW

if HAS_TENSORFLOW:
    import tensorflow as tf

# Global model container
gstnet_model = None

def load_ai_model():
    """
    Attempts to load the trained GSTNet model from disk.
    If no trained weights exist, it builds and compiles a new model
    from scratch so the server remains fully functional for testing.
    """
    global gstnet_model
    model_weights_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'model', 'gstnet_model.keras')
    
    print("Loading GSTNet Keras Model...")
    try:
        if os.path.exists(model_weights_path) and HAS_TENSORFLOW:
            from model.gstnet_model import ChannelAvgPool, ChannelMaxPool
            gstnet_model = tf.keras.models.load_model(
                model_weights_path,
                custom_objects={
                    'ChannelAvgPool': ChannelAvgPool,
                    'ChannelMaxPool': ChannelMaxPool
                }
            )
            print("Successfully loaded trained GSTNet model.")
        else:
            gstnet_model = build_gstnet_model()
            print("No saved weights found. Initialized scratch GSTNet architecture for testing.")
    except Exception as e:
        print(f"Error loading model: {e}. Building scratch architecture fallback...")
        gstnet_model = build_gstnet_model()
        
    return gstnet_model

def create_app():
    """
    Initializes Flask application, configures SQLite database,
    enables CORS, loads AI model, and sets up static folders.
    """
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS globally for all routes (to support mobile connections on local networks)
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Initialize SQLite database schema
    print("Initializing SQLite Database...")
    init_db()
    
    # Load the AI model at startup (before registering routes)
    load_ai_model()
    
    # Register blueprints (routes)
    from backend.routes import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")
    
    # Static serving routes for uploads and reports
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)
        
    @app.route('/reports/<path:filename>')
    def serve_report(filename):
        return send_from_directory(REPORTS_FOLDER, filename)
        
    # Health check route
    @app.route('/health')
    def health():
        return {"status": "healthy", "database": "connected"}, 200
        
    @app.route('/')
    def home():
        return {
            "project": "GSTNet Gallstone Detection System",
            "status": "Backend Running",
            "api": "/api",
            "health": "/health"
        }
        
    return app

# Create application instance
app = create_app()

if __name__ == '__main__':
    # Start Flask server (debug=False to avoid double model loading)
    app.run(host='0.0.0.0', port=5000, debug=False)
