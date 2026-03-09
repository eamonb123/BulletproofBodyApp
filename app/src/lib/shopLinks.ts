function toSearchQuery(brand?: string, name?: string) {
  const terms = [brand, name]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);

  const query = terms.join(" ");
  return encodeURIComponent(query || "high protein snacks");
}

export function buildInstacartSearchUrl(brand: string, name: string) {
  // Use Instacart's current search route. True "add-to-cart" flows require API credentials.
  return `https://www.instacart.com/store/s?k=${toSearchQuery(brand, name)}`;
}

export function buildWalmartSearchUrl(brand: string, name: string) {
  return `https://www.walmart.com/search?q=${toSearchQuery(brand, name)}`;
}
