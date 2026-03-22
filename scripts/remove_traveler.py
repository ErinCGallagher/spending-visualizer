"""Remove one traveler's split of expenses from a TravelSpend CSV export.

For each expense row:
  - If the traveler is the sole participant, the row is dropped entirely.
  - If the traveler is one of several participants, their share is subtracted
    from the total amount (both local and home currency) and their splitObjects
    entry is removed.

Usage:
    python remove_traveler.py <input.csv> <traveler_name> <output.csv>

Example:
    python remove_traveler.py trip.csv egal trip_without_egal.csv
"""

import ast
import csv
import sys


def parse_split_objects(raw: str) -> list[dict]:
    """Parse the splitObjects field, which uses single-quoted Python dict syntax."""
    try:
        return ast.literal_eval(raw)
    except Exception:
        return []


def format_split_objects(splits: list[dict]) -> str:
    """Serialise splits back to the original single-quoted format."""
    parts = []
    for s in splits:
        inner = ",".join(
            f"'{k}':{repr(v) if isinstance(v, str) else v}"
            for k, v in s.items()
        )
        parts.append("{" + inner + "}")
    return "[" + ",".join(parts) + "]"


def main():
    if len(sys.argv) != 4:
        print("Usage: python remove_traveler.py <input.csv> <traveler_name> <output.csv>")
        sys.exit(1)

    input_path, traveler, output_path = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    if not rows:
        print("Error: input CSV is empty.")
        sys.exit(1)

    header = rows[0]
    data_rows = rows[1:]

    if traveler not in header:
        print(f"Error: traveler '{traveler}' is not a column in this CSV.")
        print(f"Columns found: {header}")
        sys.exit(1)

    col = {name: i for i, name in enumerate(header)}

    # Build a name→traveler-ID mapping by pairing paidFor names with splitObjects
    # entries in order — reliable when the list lengths match (which they always should).
    name_to_id: dict[str, str] = {}
    for row in data_rows:
        paid_for = [t.strip() for t in row[col["paidFor"]].split(",")]
        splits = parse_split_objects(row[col["splitObjects"]])
        if len(paid_for) == len(splits):
            for name, split in zip(paid_for, splits):
                traveler_id = split.get("forTravelerId")
                if name and traveler_id and name not in name_to_id:
                    name_to_id[name] = traveler_id

    target_id = name_to_id.get(traveler)
    if not target_id:
        print(f"Warning: could not resolve a traveler ID for '{traveler}'. "
              "Will fall back to matching by share amount.")

    output_rows = [header]
    removed = 0
    modified = 0

    for row in data_rows:
        paid_for = [t.strip() for t in row[col["paidFor"]].split(",")]

        if traveler not in paid_for:
            output_rows.append(row)
            continue

        remaining_travelers = [t for t in paid_for if t != traveler]

        # Solo expense — drop the row entirely.
        if not remaining_travelers:
            removed += 1
            continue

        # Find the traveler's split entry.
        splits = parse_split_objects(row[col["splitObjects"]])
        traveler_split = None
        remaining_splits = []

        for split in splits:
            if target_id and split.get("forTravelerId") == target_id:
                traveler_split = split
            else:
                remaining_splits.append(split)

        # Fallback: match by shareInHomeCurrency if the ID lookup failed.
        if traveler_split is None:
            try:
                home_share = float(row[col[traveler]].strip())
                target_cents = round(home_share * 1000)
                for i, split in enumerate(splits):
                    if abs(split.get("shareInHomeCurrency", 0) - target_cents) <= 10:
                        traveler_split = split
                        remaining_splits = [s for j, s in enumerate(splits) if j != i]
                        break
            except (ValueError, KeyError):
                pass

        # Subtract the traveler's share from the totals.
        try:
            current_amount = float(row[col["amount"]].strip())
            current_home = float(row[col["amountInHomeCurrency"]].strip())
        except ValueError:
            # If we can't parse the amounts, leave the row unchanged.
            output_rows.append(row)
            continue

        if traveler_split:
            # splitObjects shares are stored in thousandths of the currency unit.
            local_deduction = traveler_split["share"] / 1000
            home_deduction = traveler_split["shareInHomeCurrency"] / 1000
        else:
            # Estimate the local deduction from the home share and conversion rate.
            try:
                home_deduction = float(row[col[traveler]].strip())
                rate = float(row[col["conversionRate"]].strip())
                local_deduction = home_deduction * rate
            except (ValueError, KeyError):
                home_deduction = 0.0
                local_deduction = 0.0

        new_row = list(row)
        new_row[col["amount"]] = f"{current_amount - local_deduction:.2f}"
        new_row[col["amountInHomeCurrency"]] = f" {current_home - home_deduction:.2f}"
        new_row[col["paidFor"]] = ",".join(remaining_travelers)
        new_row[col[traveler]] = " 0.00"
        new_row[col["splitObjects"]] = format_split_objects(remaining_splits)

        output_rows.append(new_row)
        modified += 1

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerows(output_rows)

    print(f"Traveler '{traveler}' removed.")
    print(f"  Modified rows : {modified}")
    print(f"  Removed rows  : {removed} (traveler was sole participant)")
    print(f"  Output        : {output_path}")


if __name__ == "__main__":
    main()
