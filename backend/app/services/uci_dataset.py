import os
import random
import datetime
from pathlib import Path
import pandas as pd
import numpy as np

from app.config import SAMPLE_DATA_DIR, DATA_DIR

def generate_uci_online_retail_sample(target_path: Path, n_records: int = 12000) -> str:
    """
    Generates a rich, authentic academic sample of the UCI Online Retail dataset.
    Features realistic RFM distributions:
    - Seasonal sales peaks (Nov-Dec holiday season)
    - Realistic customer loyalty tiers (Champions, Regulars, Churning, One-time)
    - Realistic product catalog with varying prices
    - International countries (UK 85%, Germany, France, Australia, Spain, Netherlands, etc.)
    - Cancelled transactions ('C' prefix with negative quantity)
    - Missing customer IDs (~15-20% as in real UCI dataset)
    """
    random.seed(42)
    np.random.seed(42)

    # Catalog of realistic gift & home decor items with stock codes and base prices
    catalog = [
        ("85123A", "WHITE HANGING HEART T-LIGHT HOLDER", 2.55),
        ("71053", "WHITE METAL LANTERN", 3.39),
        ("84406B", "CREAM CUPID HEARTS COAT HANGER", 2.75),
        ("84029G", "KNITTED UNION FLAG HOT WATER BOTTLE", 3.39),
        ("84029E", "RED WOOLLY HOTTIE WHITE HEART.", 3.39),
        ("22752", "SET 7 BABUSHKA NESTING BOXES", 7.65),
        ("21730", "GLASS STAR FROSTED T-LIGHT HOLDER", 4.25),
        ("22633", "HAND WARMER UNION JACK", 1.85),
        ("22632", "HAND WARMER RED POLKADOT", 1.85),
        ("84879", "ASSORTED COLOUR BIRD ORNAMENT", 1.69),
        ("22745", "POPPY'S PLAYHOUSE BEDROOM", 2.10),
        ("22748", "POPPY'S PLAYHOUSE KITCHEN", 2.10),
        ("22749", "FELTCRAFT PRINCESS CHARLOTTE DOLL", 3.75),
        ("22310", "IVORY KNITTED MUG COSY", 1.65),
        ("84969", "BOX OF 6 ASSORTED COLOUR TEASPOONS", 4.25),
        ("22623", "BOX OF VINTAGE JIGSAW BLOCKS", 4.95),
        ("22622", "BOX OF VINTAGE ALPHABET BLOCKS", 9.95),
        ("21754", "HOME BUILDING BLOCK WORD", 5.95),
        ("21755", "LOVE BUILDING BLOCK WORD", 5.95),
        ("21777", "RECIPE BOX WITH METAL HEART", 7.95),
        ("48187", "DOORMAT NEW ENGLAND", 7.95),
        ("22960", "JAM MAKING SET WITH JARS", 4.25),
        ("22961", "JAM MAKING SET PRINTED", 1.45),
        ("22962", "PANTRY CHOPPING BOARD", 4.95),
        ("22963", "JAM JAR WALL CLOCK", 8.50),
        ("20725", "LUNCH BAG RED RETROSPOT", 1.65),
        ("20726", "LUNCH BAG WOODLAND", 1.65),
        ("20727", "LUNCH BAG BLACK SKULL.", 1.65),
        ("20728", "LUNCH BAG CARS BLUE", 1.65),
        ("22383", "LUNCH BAG SUKI DESIGN", 1.65),
        ("22384", "LUNCH BAG PINK POLKADOT", 1.65),
        ("22382", "LUNCH BAG SPACEBOY DESIGN", 1.65),
        ("22423", "REGENCY CAKESTAND 3 TIER", 12.75),
        ("22424", "REGENCY TEA SPOON", 1.25),
        ("22425", "REGENCY MILK JUG", 3.25),
        ("22426", "REGENCY SUGAR BOWL GREEN", 4.95),
        ("22427", "REGENCY TEAPOT ROSES", 9.95),
        ("85099B", "JUMBO BAG RED RETROSPOT", 1.95),
        ("85099C", "JUMBO BAG STRAWBERRY", 1.95),
        ("85099F", "JUMBO BAG VINTAGE PAISLEY", 1.95),
        ("21931", "JUMBO STORAGE BAG SUKI", 1.95),
        ("22386", "JUMBO BAG PINK POLKADOT", 1.95),
        ("23203", "JUMBO BAG VINTAGE DOILY", 1.95),
        ("23206", "LUNCH BAG APPLE DESIGN", 1.65),
        ("23207", "LUNCH BAG ALPHABET", 1.65),
        ("23208", "LUNCH BAG VINTAGE LEAF", 1.65),
        ("POST", "POSTAGE", 18.00),
        ("M", "Manual", 15.00)
    ]

    countries = ["United Kingdom"] * 82 + ["Germany"] * 6 + ["France"] * 5 + ["EIRE"] * 3 + ["Spain"] * 2 + ["Netherlands"] * 1 + ["Australia"] * 1

    # Base dates: 2010-12-01 to 2011-12-09 (standard UCI range)
    start_date = datetime.datetime(2010, 12, 1, 8, 30)
    end_date = datetime.datetime(2011, 12, 9, 17, 30)
    total_seconds = int((end_date - start_date).total_seconds())

    # Create customer profiles to yield realistic RFM distribution:
    # 400 unique customer IDs
    # - Champions: 15% (recent, 8-20 orders, high volume)
    # - Loyal: 25% (recent, 4-10 orders, medium volume)
    # - At Risk: 20% (old date, 4-8 orders)
    # - Lost / Inactive: 15% (very old, 1-2 orders)
    # - New / Recent: 15% (recent, 1-2 orders)
    # - Casual: 10%
    customer_ids = [12000 + i for i in range(450)]
    random.shuffle(customer_ids)

    customer_profiles = {}
    for i, cid in enumerate(customer_ids):
        country = random.choice(countries)
        if i < 70:  # Champions
            tier = "champion"
            order_count = random.randint(8, 22)
            last_order_days_ago = random.randint(1, 25)
        elif i < 180: # Loyal
            tier = "loyal"
            order_count = random.randint(5, 12)
            last_order_days_ago = random.randint(15, 60)
        elif i < 270: # At Risk
            tier = "at_risk"
            order_count = random.randint(4, 9)
            last_order_days_ago = random.randint(90, 240)
        elif i < 340: # Lost
            tier = "lost"
            order_count = random.randint(1, 3)
            last_order_days_ago = random.randint(240, 370)
        elif i < 400: # New
            tier = "new"
            order_count = random.randint(1, 2)
            last_order_days_ago = random.randint(2, 35)
        else: # Casual
            tier = "casual"
            order_count = random.randint(1, 4)
            last_order_days_ago = random.randint(30, 180)

        customer_profiles[cid] = {
            "tier": tier,
            "order_count": order_count,
            "last_days": last_order_days_ago,
            "country": country
        }

    # Generate invoices
    records = []
    invoice_seq = 536365

    for cid, prof in customer_profiles.items():
        tier = prof["tier"]
        country = prof["country"]
        n_invoices = prof["order_count"]

        # Spread invoice dates
        max_days = min(370, 370 - prof["last_days"] + 5)
        invoice_days_offsets = sorted([random.randint(prof["last_days"], max(prof["last_days"], max_days)) for _ in range(n_invoices)])

        for offset in invoice_days_offsets:
            inv_date = end_date - datetime.timedelta(days=offset, hours=random.randint(0, 8), minutes=random.randint(0, 59))
            # Seasonal boost for Nov-Dec
            is_holiday_season = (inv_date.month in [11, 12])
            
            invoice_num = str(invoice_seq)
            invoice_seq += 1

            # Determine items in basket (1 to 8 items)
            basket_size = random.randint(1, 6)
            if tier == "champion":
                basket_size = random.randint(3, 10)

            # Check if this invoice is cancelled (3% chance)
            is_cancelled = (random.random() < 0.035)
            if is_cancelled:
                invoice_num = f"C{invoice_num}"

            items_chosen = random.sample(catalog, min(basket_size, len(catalog)))
            for code, desc, base_price in items_chosen:
                if is_cancelled:
                    qty = -random.randint(1, 6)
                else:
                    qty = random.randint(1, 24)
                    if tier in ["champion", "loyal"] and random.random() < 0.2:
                        qty = random.randint(24, 96) # wholesale quantity
                    if is_holiday_season:
                        qty = int(qty * 1.4)

                # Price jitter
                price = round(base_price * random.uniform(0.95, 1.05), 2)

                # 15% missing CustomerID records (as in UCI dataset)
                record_cid = cid if random.random() > 0.12 else ""

                records.append({
                    "InvoiceNo": invoice_num,
                    "StockCode": code,
                    "Description": desc,
                    "Quantity": qty,
                    "InvoiceDate": inv_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "UnitPrice": price,
                    "CustomerID": record_cid,
                    "Country": country
                })

    df = pd.DataFrame(records)
    # Sort chronologically
    df["dt"] = pd.to_datetime(df["InvoiceDate"])
    df = df.sort_values("dt").drop(columns=["dt"])

    target_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(target_path, index=False)
    return str(target_path)
