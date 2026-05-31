import os
import random
import numpy as np
try:
    import tensorflow as tf
    HAS_TENSORFLOW = True
except ImportError:
    HAS_TENSORFLOW = False
from PIL import Image, ImageDraw
import matplotlib.pyplot as plt
from model.gstnet_model import build_gstnet_model, extract_texture_features

def synthesize_dummy_data(base_dir='dataset', num_images_per_class=40):
    """
    Synthesizes simulated ultrasound scans for system testing and validation:
    - Normal scans: Contain organic kidney/liver shapes, grey noisy background.
    - Gallstone scans: Contain kidney/liver structures PLUS bright hyper-echogenic
      ellipses (the gallstone) casting a distinct dark acoustic shadow beneath it.
    """
    classes = ['Normal', 'Gallstone']
    for cls in classes:
        os.makedirs(os.path.join(base_dir, cls), exist_ok=True)
        
    print(f"Generating {num_images_per_class * 2} simulated ultrasound scans in '{base_dir}'...")
    
    for cls in classes:
        cls_dir = os.path.join(base_dir, cls)
        # Generate files
        for i in range(num_images_per_class):
            # Create a noisy grayscale background (ultrasound texture)
            img_arr = np.random.normal(120, 25, (224, 224)).astype(np.uint8)
            img = Image.fromarray(img_arr).convert('RGB')
            draw = ImageDraw.Draw(img)
            
            # Draw a simulated gallbladder sac (dark oval region)
            draw.ellipse([30, 40, 190, 180], fill=(40, 40, 40))
            
            if cls == 'Gallstone':
                # Draw a gallstone: a bright echogenic spot
                stone_x = random.randint(70, 130)
                stone_y = random.randint(70, 110)
                r_w = random.randint(15, 25)
                r_h = random.randint(10, 18)
                
                # The stone (hyperechogenic - bright white/grey)
                draw.ellipse([stone_x, stone_y, stone_x + r_w, stone_y + r_h], fill=(220, 220, 220))
                
                # Draw acoustic shadow (dark vertical column beneath the stone)
                # Shadow starts below the stone and runs to the bottom of the sac
                shadow_left = stone_x - 3
                shadow_right = stone_x + r_w + 3
                for y in range(stone_y + r_h, 175):
                    # Darken the pixels to simulate shadow
                    draw.line([shadow_left, y, shadow_right, y], fill=(10, 10, 10))
            
            # Apply a slight rotation to simulate random ultrasound alignment
            img = img.rotate(random.choice([0, 2, -2, 4, -4]))
            save_path = os.path.join(cls_dir, f"{cls.lower()}_{i+1:03d}.jpg")
            img.save(save_path)
            
    print("Simulation complete.")

def load_dataset(base_dir='dataset'):
    """
    Scans dataset folder, loads images and extracts texture features.
    Returns:
        images: list of 224x224x3 image arrays
        textures: list of 24-dimensional texture arrays
        labels: binary list (0: Normal, 1: Gallstone)
    """
    images = []
    textures = []
    labels = []
    
    classes = {'Normal': 0, 'Gallstone': 1}
    for cls_name, cls_idx in classes.items():
        cls_dir = os.path.join(base_dir, cls_name)
        if not os.path.exists(cls_dir):
            continue
            
        for file in os.listdir(cls_dir):
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                img_path = os.path.join(cls_dir, file)
                
                # Load image
                img = Image.open(img_path).convert('RGB').resize((224, 224))
                img_arr = np.array(img).astype(np.float32) / 255.0
                
                # Extract texture vector
                img_gray = np.array(img.convert('L'))
                img_gray_norm = img_gray.astype(np.float32) / 255.0
                texture_vector = extract_texture_features(img_gray_norm)
                
                images.append(img_arr)
                textures.append(texture_vector)
                labels.append(cls_idx)
                
    return np.array(images), np.array(textures), np.array(labels)

def train_model(base_dir='dataset', epochs=15, batch_size=8):
    """
    Trains the custom GSTNet model using the extracted data splits.
    Generates training curves, confusion matrix, and accuracy metrics.
    """
    # 1. Synthesize if dataset missing
    if not os.path.exists(base_dir) or len(os.listdir(base_dir)) == 0:
        synthesize_dummy_data(base_dir, num_images_per_class=40)
        
    print("Loading datasets and pre-extracting texture vectors...")
    images, textures, labels = load_dataset(base_dir)
    
    if len(images) == 0:
        print("No images found for training.")
        return False
        
    # Shuffle dataset
    indices = np.arange(len(images))
    np.random.shuffle(indices)
    images, textures, labels = images[indices], textures[indices], labels[indices]
    
    # Split 80% / 10% / 10%
    n = len(images)
    train_end = int(0.8 * n)
    val_end = int(0.9 * n)
    
    train_imgs, train_texs, train_lbls = images[:train_end], textures[:train_end], labels[:train_end]
    val_imgs, val_texs, val_lbls = images[train_end:val_end], textures[train_end:val_end], labels[train_end:val_end]
    test_imgs, test_texs, test_lbls = images[val_end:], textures[val_end:], labels[val_end:]
    
    print(f"Dataset split size: Train={len(train_imgs)}, Val={len(val_imgs)}, Test={len(test_imgs)}")
    
    # 2. Build GSTNet
    model = build_gstnet_model()
    
    # 3. Train
    print("Beginning GSTNet training on VGG-19 backbone from scratch...")
    history = model.fit(
        x=[train_imgs, train_texs],
        y=train_lbls,
        validation_data=([val_imgs, val_texs], val_lbls),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
        ] if HAS_TENSORFLOW else []
    )
    
    # Save trained model weights/architecture
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gstnet_model.keras')
    model.save(model_path)
    print(f"Model saved to {model_path}")
    
    # 4. Evaluate
    print("Evaluating GSTNet model on unseen testing split...")
    results = model.evaluate([test_imgs, test_texs], test_lbls, verbose=0)
    loss, accuracy, precision, recall = results[0], results[1], results[2], results[3]
    
    # Compute F1 Score
    f1 = 2 * (precision * recall) / (precision + recall + 1e-8)
    
    print(f"Test Accuracy : {accuracy:.4f}")
    print(f"Test Precision: {precision:.4f}")
    print(f"Test Recall   : {recall:.4f}")
    print(f"Test F1-Score : {f1:.4f}")
    
    # 5. Plot training history and save
    docs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs')
    os.makedirs(docs_dir, exist_ok=True)
    
    plt.figure(figsize=(12, 5))
    
    # Plot Accuracy
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='Train Acc')
    plt.plot(history.history['val_accuracy'], label='Val Acc')
    plt.title('GSTNet Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(True)
    
    # Plot Loss
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Val Loss')
    plt.title('GSTNet Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig(os.path.join(docs_dir, 'training_curves.png'))
    plt.close()
    
    # 6. Generate and plot Confusion Matrix
    test_preds = model.predict([test_imgs, test_texs])
    test_preds_binary = (test_preds >= 0.5).astype(int).ravel()
    
    # Manual confusion matrix calculation
    tp = int(np.sum((test_lbls == 1) & (test_preds_binary == 1)))
    tn = int(np.sum((test_lbls == 0) & (test_preds_binary == 0)))
    fp = int(np.sum((test_lbls == 0) & (test_preds_binary == 1)))
    fn = int(np.sum((test_lbls == 1) & (test_preds_binary == 0)))
    
    cm = [[tn, fp], [fn, tp]]
    
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.matshow(cm, cmap=plt.cm.Blues, alpha=0.3)
    for i in range(2):
        for j in range(2):
            ax.text(x=j, y=i, s=cm[i][j], va='center', ha='center', size='xx-large')
            
    plt.xlabel('Predictions', fontsize=12)
    plt.ylabel('Actuals', fontsize=12)
    plt.title('Confusion Matrix', fontsize=14)
    plt.xticks([0, 1], ['Normal', 'Gallstone'])
    plt.yticks([0, 1], ['Normal', 'Gallstone'])
    plt.savefig(os.path.join(docs_dir, 'confusion_matrix.png'))
    plt.close()
    
    # Save training metrics to a text file for frontend
    with open(os.path.join(docs_dir, 'metrics.json'), 'w') as f:
        import json
        json.dump({
            "accuracy": round(float(accuracy), 4),
            "loss": round(float(loss), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "confusion_matrix": cm,
            "total_samples": len(images)
        }, f)
        
    print("Training process finished. Outputs saved to docs/")
    return True

if __name__ == '__main__':
    train_model(epochs=15)
