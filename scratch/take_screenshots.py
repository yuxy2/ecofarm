from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os
import time

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
workspace_dir = r"c:\YUSUF\kecerdasan buatan\projek\ecofarming-app"
output_dir = os.path.join(workspace_dir, "public")

chrome_options = Options()
chrome_options.binary_location = chrome_path
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--window-size=1280,1024")

print("Initializing headless Chrome browser via Selenium...")
driver = webdriver.Chrome(options=chrome_options)

pages = {
    "halaman_pembuka.png": "http://localhost:3000/",
    "halaman_login.png": "http://localhost:3000/login",
    "halaman_home.png": "http://localhost:3000/analisis?bypass=true",
    "halaman_petunjuk.png": "http://localhost:3000/#fitur",
    "halaman_pengembangan.png": "http://localhost:3000/#algoritma",
    "halaman_about.png": "http://localhost:3000/#tim",
    "halaman_konsultasi.png": "http://localhost:3000/analisis?bypass=true",
    "halaman_hasil.png": "http://localhost:3000/analisis?bypass=true&results=true",
    "halaman_data_training.png": "http://localhost:3000/admin?bypass=true&tab=dataset",
    "halaman_daftar_pengguna.png": "http://localhost:3000/admin?bypass=true&tab=pemakai"
}

try:
    for name, url in pages.items():
        output_path = os.path.join(output_dir, name)
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except Exception:
                pass
            
        print(f"\nNavigating to {url}...")
        driver.get(url)
        
        # Wait 5 seconds for compilation/hydration/react rendering
        print("Waiting for page mounting...")
        time.sleep(5)
        
        driver.save_screenshot(output_path)
        if os.path.exists(output_path):
            print(f"Saved successfully: {name} (Size: {os.path.getsize(output_path)} bytes)")
        else:
            print(f"Failed to capture: {name}")
finally:
    driver.quit()
    print("\nBrowser closed.")
