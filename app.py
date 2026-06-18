import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        title = title_elem.text if title_elem is not None else 'Untitled'
        
        updated_elem = entry.find('atom:updated', ns)
        updated = updated_elem.text if updated_elem is not None else ''
        
        id_elem = entry.find('atom:id', ns)
        entry_id = id_elem.text if id_elem is not None else ''
        
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href') if link_elem is not None else ''
        
        content_elem = entry.find('atom:content', ns)
        content = content_elem.text if content_elem is not None else ''
        
        entries.append({
            'id': entry_id,
            'title': title,
            'updated': updated,
            'link': link,
            'content': content
        })
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        entries = fetch_and_parse_feed()
        return jsonify(entries)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
