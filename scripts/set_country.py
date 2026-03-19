"""Sets the country column to a given value on every data row of a TravelSpend CSV export."""

import csv
import sys


def main():
    if len(sys.argv) != 3:
        print("Usage: python set_country.py <csv_file> <country>")
        sys.exit(1)

    path, country = sys.argv[1], sys.argv[2]

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    header = rows[0]
    if "country" not in header:
        print(f"Error: no 'country' column found in {path}")
        sys.exit(1)

    country_idx = header.index("country")
    for row in rows[1:]:
        row[country_idx] = country

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerows(rows)

    print(f"Updated {len(rows) - 1} rows in {path} → country = \"{country}\"")


if __name__ == "__main__":
    main()
