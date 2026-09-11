import geopandas as gpd

# WFS URL for Bhukosh (example, replace with actual layer URL)
url = "https://geodataindia.gov.in/NGDR/guestuser?mapidddd=5.11/8036583.35/2865129.52/0"

# Read the layer directly
gdf = gpd.read_file(url)

# Save as CSV
gdf.to_csv("gsi_data/bhukosh_geology.csv", index=False)
