import os
import glob
import sys
from pathlib import Path

# Add the backend directory to sys.path so we can import ml modules
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from ml.dataset_importer import import_training_csv
from ml.train_rf import train_random_forest
from ml.train_employability_lr import train_linear_employability

def train_all():
    print("--- Alumni Employability Tracer: Full Training Pipeline ---")
    
    # 1. Import Datasets
    root_dir = os.path.dirname(backend_dir)
    xlsx_files = glob.glob(os.path.join(root_dir, "PLP_*_Employability_Dataset.xlsx"))
    
    if not xlsx_files:
        print("⚠️ No dataset files found (PLP_*.xlsx).")
    else:
        print(f"📂 Found {len(xlsx_files)} datasets. Importing...")
        for file_path in sorted(xlsx_files):
            file_name = os.path.basename(file_path)
            # Try to extract year from filename, e.g., PLP_2024_...
            year_override = None
            parts = file_name.split('_')
            for part in parts:
                if part.isdigit() and len(part) == 4:
                    year_override = int(part)
                    break
            
            print(f"📥 Importing {file_name} (Year: {year_override or 'Auto'})...")
            try:
                summary = import_training_csv(csv_path=file_path, year_override=year_override)
                print(f"   ✅ Imported {summary['rows_imported']} rows.")
            except Exception as e:
                print(f"   ❌ Error importing {file_name}: {e}")

    # 2. Train Models
    print("\n🧠 Training Machine Learning Models...")
    
    try:
        rf_meta = train_random_forest()
        print(f"✅ Random Forest Model trained. Accuracy: {rf_meta['accuracy']}%")
    except Exception as e:
        print(f"❌ Random Forest Training failed: {e}")
        
    try:
        lr_meta = train_linear_employability()
        print(f"✅ Linear Regression Model trained. Accuracy: {lr_meta['accuracy']}%")
    except Exception as e:
        print(f"❌ Linear Regression Training failed: {e}")

    print("\n✨ Training Pipeline Complete.")

if __name__ == "__main__":
    train_all()
