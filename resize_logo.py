from PIL import Image
import os

input_path = 'public/logo.png'
output_path = 'public/logo-1024.png'

try:
    img = Image.open(input_path)
    
    # Create new 1024x1024 transparent image
    new_img = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    
    # Calculate resize dimensions maintaining aspect ratio
    img_ratio = img.width / img.height
    target_ratio = 1.0
    
    if img_ratio > target_ratio:
        # Width is the limiting factor
        new_width = 1024
        new_height = int(1024 / img_ratio)
    else:
        # Height is the limiting factor
        new_height = 1024
        new_width = int(1024 * img_ratio)
        
    resized_logo = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Calculate position to center
    x_offset = (1024 - new_width) // 2
    y_offset = (1024 - new_height) // 2
    
    # Paste resized logo onto new canvas
    new_img.paste(resized_logo, (x_offset, y_offset))
    
    new_img.save(output_path)
    print(f"Successfully saved 1024x1024 logo to {output_path}")

except Exception as e:
    print(f"Error: {e}")
