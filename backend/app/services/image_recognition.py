import os
import cv2
import numpy as np
from PIL import Image, ImageOps
import io
from typing import Dict, Any, Optional, List, Tuple
from ultralytics import YOLO

class CivicImageRecognizer:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(CivicImageRecognizer, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, models_dir: str = "models"):
        if getattr(self, "_initialized", False):
            return

        cls_path = os.path.join(models_dir, "yolov8n-cls.pt")
        det_path = os.path.join(models_dir, "yolov8n.pt")
        
        # Fallback to current directory or models subdir
        if not os.path.exists(cls_path):
            cls_path = "yolov8n-cls.pt"
        if not os.path.exists(det_path):
            det_path = "yolov8n.pt"
            
        print(f"[AI] Loading computer vision models from {det_path} and {cls_path}...")
        self.cls_model = YOLO(cls_path)
        self.det_model = YOLO(det_path)
        self._initialized = True
        print("[AI] Civic infrastructure image recognition models ready.")

        # Document and screenshot classes
        self.doc_classes = {
            'menu', 'web_site', 'envelope', 'packet', 'book_jacket', 'comic_book', 
            'crossword_puzzle', 'binder', 'notebook', 'paper_towel', 'carton', 
            'modem', 'monitor', 'screen', 'television', 'scoreboard', 'digital_clock',
            'cash_machine', 'slot', 'vending_machine', 'payphone'
        }
        
        # Animal classes in COCO
        self.animal_det_classes = {
            'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'
        }
        
        # Food classes in COCO
        self.food_det_classes = {
            'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 
            'pizza', 'donut', 'cake'
        }
        
        # Indoor furniture & consumer electronics in COCO
        self.indoor_det_classes = {
            'couch', 'bed', 'dining table', 'toilet', 'refrigerator', 'microwave', 
            'oven', 'toaster', 'sink', 'laptop', 'cell phone', 'keyboard', 'mouse', 'remote'
        }
        
        # Civic waste indicators in ImageNet
        self.garbage_indicators = {
            'ashcan', 'garbage_truck', 'crate', 'barrel', 'carton', 'packet', 'plastic_bag'
        }

    def _cv_document_check(self, img_bgr: np.ndarray) -> Tuple[bool, str]:
        """Detect scans, documents, ID cards, receipts, and diagrams via visual properties."""
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        total_pixels = h * w
        
        # Check white background ratio (> 40% near-pure white is typical of scanned paper/diagrams)
        white_ratio = float(np.sum(gray > 240) / total_pixels)
        
        # Check color saturation (documents and diagrams have very low saturation or flat colors)
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        avg_sat = float(np.mean(sat))
        
        # Check for sharp text/line edges
        edges = cv2.Canny(gray, 100, 200)
        edge_ratio = float(np.sum(edges > 0) / total_pixels)
        
        if white_ratio > 0.40:
            return True, f"High white background ratio ({white_ratio:.1%}) typical of scanned document or diagram"
            
        if avg_sat < 15 and edge_ratio > 0.08:
            return True, "Monochrome document with dense text or line drawings"
            
        return False, ""

    def _check_road_surface(self, img_bgr: np.ndarray) -> Dict[str, Any]:
        """Analyze road/pavement surface texture and damage characteristics."""
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        
        val = hsv[:, :, 2]
        sat = hsv[:, :, 1]
        
        # Road asphalt / concrete pixels (neutral hue, mid-dark tones)
        road_mask = (sat < 75) & (val > 25) & (val < 210)
        road_ratio = float(np.sum(road_mask) / (h * w))
        
        # Cavity / depression analysis (dark depressions on road surface)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
        cavity_mask = blackhat > 22
        cavity_ratio = float(np.sum(cavity_mask) / (h * w))
        
        # Edge fissure analysis
        edges = cv2.Canny(gray, 50, 150)
        crack_ratio = float(np.sum(edges > 0) / (h * w))
        
        return {
            "road_ratio": road_ratio,
            "cavity_ratio": cavity_ratio,
            "crack_ratio": crack_ratio,
        }

    def _check_water_presence(self, img_bgr: np.ndarray) -> Dict[str, Any]:
        """Analyze water reflections, wet pavement, puddles, or flooding."""
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        
        blur = cv2.GaussianBlur(gray, (7, 7), 0)
        grad_x = cv2.Sobel(blur, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(blur, cv2.CV_64F, 0, 1, ksize=3)
        mag = cv2.magnitude(grad_x, grad_y)
        
        # Water bodies often have smooth internal texture
        smooth_mask = (mag < 15) & (gray > 30) & (gray < 220)
        smooth_ratio = float(np.sum(smooth_mask) / (h * w))
        
        # Muddy water or blue/sky reflection hue
        hue = hsv[:, :, 0]
        sat = hsv[:, :, 1]
        water_tint = ((hue > 85) & (hue < 140)) | ((hue > 10) & (hue < 35) & (sat > 35))
        water_tint_ratio = float(np.sum(water_tint) / (h * w))
        
        is_water_likely = smooth_ratio > 0.20 or water_tint_ratio > 0.12
        return {
            "smooth_ratio": smooth_ratio,
            "water_tint_ratio": water_tint_ratio,
            "is_water_likely": is_water_likely
        }

    def _check_garbage_clutter(self, img_bgr: np.ndarray, det_boxes: list) -> Dict[str, Any]:
        """Detect litter, trash piles, packaging clutter."""
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        high_sat_ratio = float(np.sum(sat > 85) / sat.size)
        
        trash_items = [b for b in det_boxes if b['name'] in {'bottle', 'cup', 'backpack', 'handbag', 'book'}]
        is_garbage = len(trash_items) >= 2 or (high_sat_ratio > 0.22 and len(det_boxes) > 0)
        
        return {
            "color_entropy": high_sat_ratio,
            "trash_item_count": len(trash_items),
            "is_garbage_likely": is_garbage
        }

    def verify_image(self, image_input: Any, category: str) -> Dict[str, Any]:
        """
        Verify image bytes or file path against civic infrastructure requirements.
        
        Returns dict with keys:
            is_valid (bool)
            category (str)
            detected_type (str)
            confidence (float)
            ai_severity (str | None)
            reason (str)
            suggested_category (str | None)
        """
        category = category.upper().strip()
        
        # Load image
        try:
            if isinstance(image_input, (str, bytes)):
                if isinstance(image_input, bytes):
                    pil_img = Image.open(io.BytesIO(image_input))
                else:
                    pil_img = Image.open(image_input)
            else:
                pil_img = Image.open(image_input)

            # Auto-orient based on EXIF tag
            pil_img = ImageOps.exif_transpose(pil_img)
            
            # Convert to RGB
            if pil_img.mode != 'RGB':
                pil_img = pil_img.convert('RGB')
                
            img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception as e:
            return {
                "is_valid": False,
                "category": category,
                "detected_type": "Corrupted or Unsupported File",
                "confidence": 0.0,
                "ai_severity": None,
                "reason": f"Could not read uploaded file as a valid image: {str(e)}. Please upload a standard photo (JPEG, PNG, WEBP).",
                "suggested_category": None
            }

        h, w, _ = img_bgr.shape
        if h < 50 or w < 50:
            return {
                "is_valid": False,
                "category": category,
                "detected_type": "Image Too Small",
                "confidence": 0.0,
                "ai_severity": None,
                "reason": "Image resolution is too low to verify infrastructure damage. Please upload a clear photo taken by a camera.",
                "suggested_category": None
            }

        # 1. OpenCV Scanned Document / Diagram / Text Check
        is_doc, doc_reason = self._cv_document_check(img_bgr)
        if is_doc:
            return {
                "is_valid": False,
                "category": category,
                "detected_type": "Document / Diagram / Screenshot",
                "confidence": 0.95,
                "ai_severity": None,
                "reason": f"Image rejected: The uploaded photo appears to be a digital document, diagram, ID card, or screenshot ({doc_reason}). Please upload an actual photo of the physical infrastructure problem.",
                "suggested_category": None
            }

        # 2. Run Classification Model (ImageNet 1000)
        cls_res = self.cls_model(pil_img, verbose=False)[0]
        top5_indices = cls_res.probs.top5
        top_name = self.cls_model.names[top5_indices[0]]
        top_conf = float(cls_res.probs.data[top5_indices[0]])
        top5_names = [self.cls_model.names[i] for i in top5_indices]

        # Check if top prediction is a document/screen
        if top_name in self.doc_classes and top_conf > 0.20:
            return {
                "is_valid": False,
                "category": category,
                "detected_type": f"Document / Screen ({top_name})",
                "confidence": round(top_conf, 2),
                "ai_severity": None,
                "reason": f"Image rejected: AI recognized this image as a document/screen/packet ({top_name}). Civic reports require physical outdoor infrastructure photos.",
                "suggested_category": None
            }

        # 3. Run Object Detection Model (COCO 80)
        det_res = self.det_model(pil_img, verbose=False)[0]
        total_area = h * w
        
        detected_objects = []
        for box in det_res.boxes:
            cls_id = int(box.cls[0])
            name = self.det_model.names[cls_id]
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            area_ratio = ((xyxy[2] - xyxy[0]) * (xyxy[3] - xyxy[1])) / total_area
            detected_objects.append({
                "name": name,
                "conf": conf,
                "area_ratio": area_ratio
            })

        # Check for Animals
        for obj in detected_objects:
            if obj['name'] in self.animal_det_classes and obj['conf'] > 0.28:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": f"Animal / Pet ({obj['name']})",
                    "confidence": round(obj['conf'], 2),
                    "ai_severity": None,
                    "reason": f"Image rejected: An animal ({obj['name']}) was detected. Please upload an image showing the actual civic infrastructure defect.",
                    "suggested_category": None
                }

        # Check for Food
        for obj in detected_objects:
            if obj['name'] in self.food_det_classes and obj['conf'] > 0.28:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": f"Food / Beverage ({obj['name']})",
                    "confidence": round(obj['conf'], 2),
                    "ai_severity": None,
                    "reason": f"Image rejected: Food or drink item ({obj['name']}) detected. Reports must capture civic infrastructure defects.",
                    "suggested_category": None
                }

        # Check for Indoor Furniture / Household Items
        for obj in detected_objects:
            if obj['name'] in self.indoor_det_classes and obj['conf'] > 0.32 and obj['area_ratio'] > 0.06:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": f"Indoor Object ({obj['name']})",
                    "confidence": round(obj['conf'], 2),
                    "ai_severity": None,
                    "reason": f"Image rejected: Indoor item or appliance ({obj['name']}) detected. Please upload a photo of public outdoor infrastructure.",
                    "suggested_category": None
                }

        # Check for Person (Portrait / Selfie)
        person_boxes = [obj for obj in detected_objects if obj['name'] == 'person' and obj['conf'] > 0.35]
        for p in person_boxes:
            if p['area_ratio'] > 0.25:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": "Personal Portrait / Selfie",
                    "confidence": round(p['conf'], 2),
                    "ai_severity": None,
                    "reason": "Image rejected: A personal portrait or selfie was detected. Reports must focus clearly on the infrastructure defect.",
                    "suggested_category": None
                }

        # 4. Problem & Category Specific Validation
        road_stats = self._check_road_surface(img_bgr)
        water_stats = self._check_water_presence(img_bgr)
        garbage_stats = self._check_garbage_clutter(img_bgr, detected_objects)
        has_ashcan = any(name in self.garbage_indicators for name in top5_names)

        ai_severity = "MEDIUM"

        if category == "POTHOLE":
            # Check for category mismatch: looks like garbage dump instead
            if garbage_stats["is_garbage_likely"] or has_ashcan:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": "Garbage Dump Scene",
                    "confidence": 0.86,
                    "ai_severity": None,
                    "reason": "Image mismatch: This photo shows garbage/litter rather than a road pothole. Please select 'Garbage Dump' as the category.",
                    "suggested_category": "GARBAGE"
                }

            # Check road surface
            if road_stats["road_ratio"] < 0.12 and road_stats["cavity_ratio"] < 0.005:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": "Non-Road / Unrelated Scene",
                    "confidence": 0.80,
                    "ai_severity": None,
                    "reason": "Image rejected: The photo does not depict a recognizable road, street, or pavement surface with a pothole.",
                    "suggested_category": None
                }

            # Calculate severity
            if road_stats["cavity_ratio"] > 0.05:
                ai_severity = "CRITICAL"
            elif road_stats["cavity_ratio"] > 0.02:
                ai_severity = "HIGH"
            elif road_stats["cavity_ratio"] > 0.008:
                ai_severity = "MEDIUM"
            else:
                ai_severity = "LOW"

        elif category == "CRACK":
            if road_stats["crack_ratio"] < 0.002 and road_stats["road_ratio"] < 0.10:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": "No Crack Lines Detected",
                    "confidence": 0.76,
                    "ai_severity": None,
                    "reason": "Image rejected: No distinct crack or structural fissure lines were detected on the surface.",
                    "suggested_category": None
                }
            if road_stats["crack_ratio"] > 0.035:
                ai_severity = "HIGH"
            elif road_stats["crack_ratio"] > 0.012:
                ai_severity = "MEDIUM"
            else:
                ai_severity = "LOW"

        elif category == "WATER_LOGGING":
            if not water_stats["is_water_likely"]:
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": "Dry / Non-Water Scene",
                    "confidence": 0.82,
                    "ai_severity": None,
                    "reason": "Image rejected: No water accumulation, street flooding, or drainage puddles were detected in the photo.",
                    "suggested_category": None
                }
            if water_stats["smooth_ratio"] > 0.40 or water_stats["water_tint_ratio"] > 0.30:
                ai_severity = "CRITICAL"
            elif water_stats["smooth_ratio"] > 0.22:
                ai_severity = "HIGH"
            else:
                ai_severity = "MEDIUM"

        elif category == "GARBAGE":
            if not garbage_stats["is_garbage_likely"] and not has_ashcan:
                # Check if it was a clean pothole
                if road_stats["road_ratio"] > 0.30 and road_stats["cavity_ratio"] > 0.015:
                    return {
                        "is_valid": False,
                        "category": category,
                        "detected_type": "Road Pothole Scene",
                        "confidence": 0.85,
                        "ai_severity": None,
                        "reason": "Image mismatch: This photo shows a road pothole or cavity rather than a garbage dump. Please select 'Pothole' as the category.",
                        "suggested_category": "POTHOLE"
                    }
                return {
                    "is_valid": False,
                    "category": category,
                    "detected_type": "No Garbage Detected",
                    "confidence": 0.78,
                    "ai_severity": None,
                    "reason": "Image rejected: No visible garbage heap, overflowing waste container, or street litter was detected in the photo.",
                    "suggested_category": None
                }
            if garbage_stats["trash_item_count"] >= 3 or garbage_stats["color_entropy"] > 0.35:
                ai_severity = "HIGH"
            else:
                ai_severity = "MEDIUM"

        elif category == "OTHER":
            # Other municipal problems (streetlights, signs, manholes, fallen poles, curbs)
            # Rejects only if totally non-outdoor / personal / indoor
            ai_severity = "MEDIUM"

        return {
            "is_valid": True,
            "category": category,
            "detected_type": f"Valid {category.title()} Evidence",
            "confidence": 0.88,
            "ai_severity": ai_severity,
            "reason": f"Photo verified: Image confirmed as valid evidence for {category.title()}.",
            "suggested_category": None
        }

# Global recognizer instance
recognizer = CivicImageRecognizer()
