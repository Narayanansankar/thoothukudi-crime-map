import os
import json
import logging
import gspread
import re
from dateutil.parser import parse as parse_date, ParserError
from google.oauth2.service_account import Credentials
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired
from collections import Counter
import Levenshtein
import gunicorn

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
skipped_rows_logger = logging.getLogger('skipped_rows')
skipped_rows_logger.setLevel(logging.WARNING)
stream_handler = logging.StreamHandler()
file_formatter = logging.Formatter('%(asctime)s - SKIPPED_ROW - %(message)s')
stream_handler.setFormatter(file_formatter)
if not skipped_rows_logger.handlers:
    skipped_rows_logger.addHandler(stream_handler)
skipped_rows_logger.propagate = False

# --- Flask App Initialization ---
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'local-secret-key-for-testing-only')
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', "YOUR_GOOGLE_MAPS_API_KEY") 
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'password123')

# --- User Management & Login ---
users = {'admin': {'password': ADMIN_PASSWORD}}
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin):
    def __init__(self, id): self.id = id

@login_manager.user_loader
def load_user(user_id): return User(user_id) if user_id in users else None

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Sign In')

# --- Google Sheets & Data Mapping Configuration ---
WORKBOOK_100_CALLS = "Crime Map"
WORKBOOK_QGIS_DATA = "Crime Map 2"
TAB_100_CALLS = "100_calls_new"
TAB_ROBBERY_THEFT = "Robbrey-theft"
TAB_HURT = "Hurt"
TAB_POCSO = "POCSO"
TAB_CCTV = "CCTV"
TAB_ATROCITY_ACTIVE = "Atrocity-Active"
TAB_ATROCITY_DORMANT = "Atrocity-Dormant"
TAB_SUBDIVISIONS = "Subdivisions"

PS_ALIAS_MAP = { "muthiahpuram": "muthiahpuram", "thoothukudi central": "thoothukudi central", "central": "thoothukudi central", "thoothukudi north": "thoothukudi north", "north": "thoothukudi north", "north ps": "thoothukudi north", "thoothukudi south": "thoothukudi south", "south": "thoothukudi south", "thermal nagar": "thermal nagar", "thermalnagar": "thermal nagar", "awps thoothukudi": "awps thoothukudi", "thazhamuthunagar": "thazhamuthunagar", "thalamuthunagar": "thazhamuthunagar", "tut awps": "awps thoothukudi", "murappanadu": "murappanadu", "pudukkottai": "pudukkottai", "pudukottai": "pudukkottai", "sipcot": "sipcot", "thattaparai": "thattaparai", "thattapari": "thattaparai", "puthiamputhur": "puthiamputhur", "awps pudukotai thoothukudi": "awps pudukotai thoothukudi", "pudu awps": "awps pudukotai thoothukudi", "maniyachi": "maniyachi", "ottapidaram": "ottapidaram", "pasuvanthanai": "pasuvanthanai", "kadambur": "kadambur", "puliyampatti": "puliyampatti", "naraikinaru": "naraikinaru", "awps kadambur": "awps kadambur", "kovilpatti east": "kovilpatti east", "kvp east": "kovilpatti east", "awps kovilapatti": "awps kovilapatti", "kvp awps": "awps kovilapatti", "kovilpatti west": "kovilpatti west", "kovilpati west": "kovilpatti west", "kvp west": "kovilpatti west", "kalugumalai": "kalugumalai", "kayathar": "kayathar", "nalatinpudur": "nalatinpudur", "nalattinpudur": "nalatinpudur", "koppampatti": "koppampatti", "vilathikulam": "vilathikulam", "vilathikulam ps": "vilathikulam", "awps vilathikulam": "awps vilathikulam", "vkm awps": "awps vilathikulam", "soorankudi": "soorankudi", "pudur": "pudur", "sankaralingapuram": "sankaralingapuram", "kadalkudi": "kadalkudi", "ettayapuram": "ettayapuram", "masarpatti": "masarpatti", "kulathur": "kulathur", "tharuvaikulam": "tharuvaikulam", "eppodumvendran": "eppodumvendran", "eppothumvendran": "eppodumvendran", "alwarthirunagari": "alwarthirunagari", "seidunganallur": "seidunganallur", "srivaikundam": "srivaikundam", "kurumbur": "kurumbur", "sawyerpuram": "sawyerpuram", "awps srivaikundam": "awps srivaikundam", "svm awps": "awps srivaikundam", "eral": "eral", "serakulam": "serakulam", "tiruchendur": "tiruchendur", "thiruchendur": "tiruchendur", "awps thiruchendur": "awps thiruchendur", "tdr awps": "awps thiruchendur", "kulasekarapattinam": "kulasekarapattinam", "kulasekaranpattinam": "kulasekarapattinam", "athoor": "athoor", "authoor": "athoor", "tiruchendur temple": "tiruchendur temple", "arumuganeri": "arumuganeri", "tiruchendur taluk": "tiruchendur taluk", "nazareth": "nazareth", "sathankulam": "sathankulam", "sattankulam": "sathankulam", "meignanapuram": "meignanapuram", "thattarmadam": "thattarmadam"}

PS_TO_SUBDIVISION_MAP = { "muthiahpuram": "Thoothukudi Town", "thoothukudi central": "Thoothukudi Town", "thoothukudi north": "Thoothukudi Town", "thoothukudi south": "Thoothukudi Town", "thermal nagar": "Thoothukudi Town", "awps thoothukudi": "Thoothukudi Town", "thazhamuthunagar": "Thoothukudi Town", "murappanadu": "Thoothukudi Rural", "pudukkottai": "Thoothukudi Rural", "sipcot": "Thoothukudi Rural", "thattaparai": "Thoothukudi Rural", "puthiamputhur": "Thoothukudi Rural", "awps pudukotai thoothukudi": "Thoothukudi Rural", "maniyachi": "Maniyachi", "ottapidaram": "Maniyachi", "pasuvanthanai": "Maniyachi", "kadambur": "Maniyachi", "puliyampatti": "Maniyachi", "naraikinaru": "Maniyachi", "awps kadambur": "Maniyachi", "kovilpatti east": "Kovilpatti", "awps kovilapatti": "Kovilpatti", "kovilpatti west": "Kovilpatti", "kalugumalai": "Kovilpatti", "kayathar": "Kovilpatti", "nalatinpudur": "Kovilpatti", "koppampatti": "Kovilpatti", "vilathikulam": "Vilathikulam", "awps vilathikulam": "Vilathikulam", "soorankudi": "Vilathikulam", "pudur": "Vilathikulam", "sankaralingapuram": "Vilathikulam", "kadalkudi": "Vilathikulam", "ettayapuram": "Vilathikulam", "masarpatti": "Vilathikulam", "kulathur": "Vilathikulam", "tharuvaikulam": "Vilathikulam", "eppodumvendran": "Vilathikulam", "alwarthirunagari": "Srivaikundam", "seidunganallur": "Srivaikundam", "srivaikundam": "Srivaikundam", "kurumbur": "Srivaikundam", "sawyerpuram": "Srivaikundam", "awps srivaikundam": "Srivaikundam", "eral": "Srivaikundam", "serakulam": "Srivaikundam", "tiruchendur": "Tiruchendur", "awps thiruchendur": "Tiruchendur", "kulasekarapattinam": "Tiruchendur", "athoor": "Tiruchendur", "tiruchendur temple": "Tiruchendur", "arumuganeri": "Tiruchendur", "tiruchendur taluk": "Tiruchendur", "nazareth": "Sathankulam", "sathankulam": "Sathankulam", "meignanapuram": "Sathankulam", "thattarmadam": "Sathankulam"}

MASTER_STATION_LIST = list(PS_TO_SUBDIVISION_MAP.keys())

SDO_ABBREVIATION_MAP = {
    "VKM": "Vilathikulam", "7": "Vilathikulam", 
    "SKM": "Sathankulam", "8": "Sathankulam", 
    "RURAL": "Thoothukudi Rural", "TUT RURAL": "Thoothukudi Rural", "2": "Thoothukudi Rural", 
    "MNI": "Maniyachi", "5": "Maniyachi", 
    "TDR": "Tiruchendur", "3": "Tiruchendur", 
    "KVP": "Kovilpatti", "6": "Kovilpatti", 
    "TUT": "Thoothukudi Town",
    "TOWN": "Thoothukudi Town", "TUT TOWN": "Thoothukudi Town", "1": "Thoothukudi Town", 
    "SVM": "Srivaikundam", "4": "Srivaikundam"
}

SDO_FULL_NAME_MAP = { "Vilathikulam": "Vilathikulam", "Sathankulam": "Sathankulam", "Thoothukudi Rural": "Thoothukudi Rural", "Maniyachi": "Maniyachi", "Tiruchendur": "Tiruchendur", "Kovilpatti": "Kovilpatti", "Thoothukudi Town": "Thoothukudi Town", "Srivaikundam": "Srivaikundam", "Tut Rural": "Thoothukudi Rural"}

EVENT_TYPE_GROUPS = { "Fighting / Threatening": ["Fighting", "Fight", "Threatening", "Drunken Brawl"], "Family Dispute": ["Family Dispute", "Family Fighting"], "Road Accident": ["Road Accident"], "Fire Accident": ["Fire Accident", "Fire"], "Woman & Child Related": ["Woman and child Related", "Woman Related", "Child Related"], "Theft / Robbery": ["Theft", "Robbery", "Robbrey-theft"], "Civil Dispute": ["Civil Dispute", "Encroachment"], "Complaint Against Police": ["Complaint Against Police"], "Prohibition Related": ["Prohibition"], "Others": ["Others", "Disturbance", "Cheating", "Missing Person", "Cyber Crime", "Rescue Works"] }

# --- Google Sheets Client ---
gc = None
def get_gspread_client():
    global gc
    if gc is None:
        try:
            scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"]
            if 'GSPREAD_SERVICE_ACCOUNT' in os.environ:
                creds_json = json.loads(os.environ['GSPREAD_SERVICE_ACCOUNT'])
                creds = Credentials.from_service_account_info(creds_json, scopes=scopes)
                logging.info("Successfully authenticated with Google Sheets from environment variable.")
            else:
                creds = Credentials.from_service_account_file('credentials.json', scopes=scopes)
                logging.info("Successfully authenticated with Google Sheets from credentials.json file.")
            gc = gspread.authorize(creds)
        except FileNotFoundError:
            logging.error("CRITICAL: 'credentials.json' file not found and GSPREAD_SERVICE_ACCOUNT env var not set. Cannot connect to Google Sheets.")
            gc = "ERROR"
        except Exception as e:
            logging.error(f"Failed to authenticate with Google Sheets: {e}")
            gc = "ERROR"
    return gc if gc != "ERROR" else None

# --- Data Cleaning & Standardization Functions ---
def clean_event_type(messy_type):
    if not messy_type: return "Others"
    messy_type_lower = str(messy_type).lower()
    for clean_category, keywords in EVENT_TYPE_GROUPS.items():
        for keyword in keywords:
            if keyword.lower() in messy_type_lower: return clean_category
    return "Others"

def find_best_match_levenshtein(key, master_list, threshold=80):
    if not key: return None
    best_match, min_distance = None, float('inf')
    for master_item in master_list:
        distance = Levenshtein.distance(key, master_item.lower())
        if distance < min_distance:
            min_distance, best_match = distance, master_item
    if best_match:
        max_len = max(len(key), len(best_match))
        if max_len == 0: return best_match
        similarity = (1 - (min_distance / max_len)) * 100
        if similarity >= threshold: return best_match
    return None

def standardize_police_station(messy_station, sdo_fallback=None):
    if not messy_station: return None
    key = str(messy_station).lower().replace('.', '').replace('ps', '').strip()
    exact_match = PS_ALIAS_MAP.get(key)
    if exact_match: return exact_match
    fuzzy_match = find_best_match_levenshtein(key, MASTER_STATION_LIST)
    if fuzzy_match: return fuzzy_match
    if sdo_fallback and SDO_ABBREVIATION_MAP.get(key.upper()) == sdo_fallback:
        return sdo_fallback.lower().replace(" ", "")
    return None

def get_lat_lon(row):
    lat_str, lon_str = None, None
    lat_key = next((k for k in row if 'lat' in str(k).lower()), None)
    lon_key = next((k for k in row if 'lon' in str(k).lower() or 'long' in str(k).lower()), None)
    if lat_key:
        potential_val = str(row.get(lat_key, '')).strip()
        found_coords = re.findall(r'([+-]?\d+\.\d+)', potential_val)
        if len(found_coords) >= 2: lat_str, lon_str = found_coords[0], found_coords[1]
    if not (lat_str and lon_str) and lat_key and lon_key:
        lat_str, lon_str = str(row.get(lat_key, '')).strip(), str(row.get(lon_key, '')).strip()
    if not (lat_str and lon_str): return None, None
    try:
        lat_match, lon_match = re.search(r'[+-]?\d+\.\d+', lat_str), re.search(r'[+-]?\d+\.\d+', lon_str)
        if not (lat_match and lon_match): return None, None
        lat, lon = float(lat_match.group(0)), float(lon_match.group(0))
    except (ValueError, TypeError): return None, None
    if 8.0 < lat < 9.5 and 77.5 < lon < 78.5: return lat, lon
    if 8.0 < lon < 9.5 and 77.5 < lat < 78.5: return lon, lat
    return None, None

def standardize_date(date_string):
    if not date_string: return None
    date_str_cleaned = str(date_string).strip().lower()
    if date_str_cleaned in ['between', 'after', 'before']: return None
    match = re.search(r'\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4}', date_str_cleaned)
    date_to_parse = match.group(0) if match else date_str_cleaned
    try: return parse_date(date_to_parse, dayfirst=True, fuzzy=False).strftime('%Y-%m-%d')
    except (ValueError, TypeError, ParserError):
        try: return parse_date(date_to_parse, dayfirst=True, fuzzy=True).strftime('%Y-%m-%d')
        except (ValueError, TypeError, ParserError): return None

# --- Data Fetching and Processing ---
def robust_fetch_from_sheet(gc_client, workbook_name, sheet_name):
    logging.info(f"Fetching data for '{sheet_name}' from '{workbook_name}'...")
    try:
        spreadsheet = gc_client.open(workbook_name)
        worksheet = spreadsheet.worksheet(sheet_name)
        return worksheet.get_all_records(head=2) if sheet_name == TAB_100_CALLS else worksheet.get_all_records()
    except Exception as e:
        logging.error(f"Error fetching '{sheet_name}': {e}", exc_info=True)
        return []

def get_date_range(data):
    dates = [item['Date'] for item in data if item.get('Date')]
    return (min(dates), max(dates)) if dates else (None, None)

def process_records(records, record_type):
    processed_data, counters = [], Counter()
    for i, row in enumerate(records):
        original_row = dict(row)
        if not any(str(val).strip() for val in original_row.values()):
            counters['skipped_empty_row'] += 1
            continue
        row_num = i + 3
        lat, lon = get_lat_lon(original_row)
        if lat is None or lon is None:
            skipped_rows_logger.warning(f"SHEET: {record_type.upper()} | ROW: {row_num} | REASON: Invalid Coordinates | DATA: {original_row}")
            counters['skipped_for_coords'] += 1
            continue
        date_val = original_row.get('Date') or original_row.get('Occurance Mon') or original_row.get('DescriptionE')
        standard_date = standardize_date(date_val)
        if not standard_date and record_type in ['100_calls', 'robbery_theft', 'pocso']:
             skipped_rows_logger.warning(f"SHEET: {record_type.upper()} | ROW: {row_num} | REASON: Invalid Date | DATA: {original_row}")
             counters['skipped_for_date'] += 1
             continue
        subdivision, station_key, station_name_from_row, sdo_key_from_row = None, None, None, None
        if record_type in ['100_calls', 'robbery_theft']:
            station_name_from_row = original_row.get('Police Station') or original_row.get('Station')
            sdo_key_from_row = str(original_row.get('SDOs','')).strip()
            sdo_fullname_fallback = SDO_ABBREVIATION_MAP.get(sdo_key_from_row.upper())
            station_key = standardize_police_station(station_name_from_row, sdo_fullname_fallback)
            subdivision = PS_TO_SUBDIVISION_MAP.get(station_key)
        elif record_type in ['hurt', 'pocso', 'cctv']:
            sdo_key_from_row = str(original_row.get('SDO') or original_row.get('SDOs','') or '').strip()
            cleaned_sdo_key = re.sub(r'^\d+\.\s*', '', sdo_key_from_row).upper()
            subdivision = SDO_ABBREVIATION_MAP.get(cleaned_sdo_key)
            if not subdivision:
                subdivision = SDO_FULL_NAME_MAP.get(sdo_key_from_row.title())
        if not subdivision:
            skipped_rows_logger.warning(f"SHEET: {record_type.upper()} | ROW: {row_num} | REASON: Unmapped Station/SDO '{station_name_from_row or sdo_key_from_row}' | DATA: {original_row}")
            counters['skipped_for_mapping'] += 1
            continue
        clean_row = {'Latitude': lat, 'Longitude': lon, 'Subdivision': subdivision, 'Date': standard_date}
        if record_type == '100_calls':
            event_type_value = original_row.get('Event type') or original_row.get('Event type ')
            clean_row['EventType'] = clean_event_type(event_type_value)
            clean_row['PoliceStation'] = (station_key or "").title()
        elif record_type == 'robbery_theft':
            clean_row['Station'] = (station_key or "").title()
            clean_row['CrimeType'] = str(original_row.get('Description', '')).strip()
        elif record_type == 'hurt':
            clean_row['Station'] = str(original_row.get('PS Limit', '')).strip()
            sub_category_raw = original_row.get('Crime Type', '')
            sub_category_lower = str(sub_category_raw).lower()
            clean_row['SubCategory'] = "Grievous" if 'grievous' in sub_category_lower or 'grevious' in sub_category_lower else "Simple"
        elif record_type == 'pocso':
            description = str(original_row.get('Description - Real /Elopment', '')).lower()
            clean_row['SubCategory'] = "Elopement" if 'elopement' in description else "Real"
        elif record_type == 'cctv':
            clean_row['Place_Name'] = original_row.get('Name of the place')
            
        processed_data.append(clean_row)
        counters['processed_successfully'] += 1
    logging.info(f"--- Processing Report for {record_type.upper()} ---")
    logging.info(f"Total Rows Read: {len(records)}")
    for reason, count in sorted(counters.items()):
        logging.info(f"{reason.replace('_', ' ').title()}: {count}")
    logging.info("-------------------------------------------")
    return processed_data

def fetch_and_process_100_calls():
    gc_client = get_gspread_client()
    if not gc_client: return {"data": [], "filters": {}}
    records = robust_fetch_from_sheet(gc_client, WORKBOOK_100_CALLS, TAB_100_CALLS)
    processed_data = process_records(records, '100_calls')
    if not processed_data: return {"data": [], "filters": {}}
    filters = {"event_types": sorted(list(set(item.get('EventType') for item in processed_data))), "subdivisions": sorted(list(set(item['Subdivision'] for item in processed_data))), "date_range": get_date_range(processed_data)}
    return {"data": processed_data, "filters": filters}

def fetch_and_process_robbery_theft():
    gc_client = get_gspread_client()
    if not gc_client: return {"data": [], "filters": {}}
    records = robust_fetch_from_sheet(gc_client, WORKBOOK_QGIS_DATA, TAB_ROBBERY_THEFT)
    processed_data = process_records(records, 'robbery_theft')
    if not processed_data: return {"data": [], "filters": {}}
    crime_types = sorted(list(set(item['CrimeType'] for item in processed_data if item.get('CrimeType'))))
    filters = {
        "subdivisions": sorted(list(set(item['Subdivision'] for item in processed_data))),
        "date_range": get_date_range(processed_data),
        "crime_types": crime_types
    }
    return {"data": processed_data, "filters": filters}
    
def fetch_and_process_hurt():
    gc_client = get_gspread_client()
    if not gc_client: return {"data": [], "filters": {}}
    records = robust_fetch_from_sheet(gc_client, WORKBOOK_QGIS_DATA, TAB_HURT)
    processed_data = process_records(records, 'hurt')
    if not processed_data: return {"data": [], "filters": {}}
    filters = {
        "subdivisions": sorted(list(set(item['Subdivision'] for item in processed_data)))
    }
    return {"data": processed_data, "filters": filters}

def fetch_and_process_pocso():
    gc_client = get_gspread_client()
    if not gc_client: return {"data": [], "filters": {}}
    records = robust_fetch_from_sheet(gc_client, WORKBOOK_QGIS_DATA, TAB_POCSO)
    processed_data = process_records(records, 'pocso')
    if not processed_data: return {"data": [], "filters": {}}
    filters = {"subdivisions": sorted(list(set(item['Subdivision'] for item in processed_data)))}
    return {"data": processed_data, "filters": filters}

def fetch_and_process_cctv():
    gc_client = get_gspread_client()
    if not gc_client: return {"data": [], "filters": {}}
    records = robust_fetch_from_sheet(gc_client, WORKBOOK_QGIS_DATA, TAB_CCTV)
    processed_data = process_records(records, 'cctv')
    if not processed_data: return {"data": [], "filters": {}}
    filters = {"subdivisions": sorted(list(set(item['Subdivision'] for item in processed_data)))}
    return {"data": processed_data, "filters": filters}

SHEET_FETCHER_MAP = {
    TAB_100_CALLS: fetch_and_process_100_calls, 
    TAB_ROBBERY_THEFT: fetch_and_process_robbery_theft,
    TAB_HURT: fetch_and_process_hurt, 
    TAB_POCSO: fetch_and_process_pocso, 
    TAB_CCTV: fetch_and_process_cctv,
}

# --- Flask Routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated: return redirect(url_for('dashboard'))
    form = LoginForm()
    if form.validate_on_submit():
        user = users.get(form.username.data)
        if user and user['password'] == form.password.data:
            login_user(User(form.username.data))
            return redirect(url_for('dashboard'))
        else: flash('Invalid username or password')
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def dashboard():
    # Try to serve React build if it exists
    react_dir = os.path.join(app.static_folder, 'react', 'assets')
    react_assets = []
    if os.path.isdir(react_dir):
        react_assets = [f for f in os.listdir(react_dir) if f.endswith(('.js', '.css'))]
        react_assets.sort(key=lambda f: (0 if f.endswith('.css') else 1))
        return render_template('react_dashboard.html', GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY, react_assets=react_assets)
    return render_template('index.html', GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY)

@app.route('/api/atrocity/<village_type>')
@login_required
def get_atrocity_villages(village_type):
    if village_type not in ('active', 'dormant'):
        return jsonify({"error": "Unknown type"}), 404
    tab = TAB_ATROCITY_ACTIVE if village_type == 'active' else TAB_ATROCITY_DORMANT
    gc_client = get_gspread_client()
    if not gc_client:
        return jsonify([])
    records = robust_fetch_from_sheet(gc_client, WORKBOOK_QGIS_DATA, tab)
    villages = []
    for r in records:
        name = r.get('VillageName') or r.get('Village Name') or r.get('village') or ''
        lat  = r.get('Lat') or r.get('lat') or r.get('Latitude') or ''
        lon  = r.get('Long') or r.get('lon') or r.get('Longitude') or ''
        try:
            villages.append({'name': str(name).strip(), 'lat': float(lat), 'lon': float(lon)})
        except (ValueError, TypeError):
            pass
    return jsonify(villages)

@app.route('/api/subdivisions')
@login_required
def get_subdivisions():
    gc_client = get_gspread_client()
    if not gc_client:
        return jsonify([])
    records = robust_fetch_from_sheet(gc_client, WORKBOOK_QGIS_DATA, TAB_SUBDIVISIONS)
    subdivisions = []
    for r in records:
        name = r.get('SubdivisionName') or r.get('Subdivision') or r.get('Name') or ''
        name = str(name).strip()
        if name:
            subdivisions.append(name)
    return jsonify(subdivisions)

@app.route('/api/data/<sheet_name>')
@login_required
def get_sheet_data(sheet_name):
    fetcher_function = SHEET_FETCHER_MAP.get(sheet_name)
    if fetcher_function:
        try:
            data = fetcher_function()
            return jsonify(data)
        except Exception as e:
            logging.error(f"Error during on-demand fetch for {sheet_name}: {e}", exc_info=True)
            return jsonify({"error": f"Failed to fetch data for {sheet_name}"}), 500
    else:
        return jsonify({"error": f"Invalid sheet name: {sheet_name}"}), 404

# --- Main Execution ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)