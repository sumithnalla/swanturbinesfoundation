"""
Database seed script for Swan Turbines Foundation.
Idempotently initializes:
1. Roles and standard permissions
2. Initial users (WEBSITTER Super Admin and Foundation Admin)
3. Initial 8 foundation campaigns
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings
from app.core.security import hash_password

settings = get_settings()

ROLES = [
    {
        "name": "super_admin",
        "description": "WEBSITTER Super Administrator with full unrestricted access",
        "permissions": ["*"],
    },
    {
        "name": "websitter_staff",
        "description": "WEBSITTER Technical Staff",
        "permissions": ["audit.read", "users.read", "roles.read"],
    },
    {
        "name": "foundation_admin",
        "description": "Foundation Executive / Administrator",
        "permissions": [
            "campaigns.read",
            "campaigns.manage",
            "requests.read",
            "requests.manage",
            "documents.read",
            "documents.manage",
            "contact.read",
            "audit.read",
        ],
    },
    {
        "name": "foundation_staff",
        "description": "Foundation Operations Staff",
        "permissions": [
            "campaigns.read",
            "requests.read",
            "requests.manage",
            "documents.read",
        ],
    },
    {
        "name": "foundation_reviewer",
        "description": "Help Request Reviewer",
        "permissions": [
            "requests.read",
            "documents.read",
        ],
    },
]

CAMPAIGNS = [
    {
        "title": "Clean Water & Sanitation Initiative",
        "slug": "clean-water-sanitation",
        "short_description": "Providing safe drinking water, deep tube wells, and hygiene infrastructure to rural villages.",
        "description": "Access to clean water is a fundamental human right. Swan Turbines Foundation installs high-efficiency solar-powered water filtration plants and deep borewells in drought-affected and fluorosis-impacted rural habitations.",
        "category": "Water",
        "status": "active",
        "featured": True,
        "display_order": 1,
        "target_amount": 1500000.0,
        "raised_amount": 820000.0,
        "currency": "INR",
        "image_url": "cleanwaterhero.jpeg",
    },
    {
        "title": "Medical Aid & Elderly Care Fund",
        "slug": "medical-aid-elderly-care",
        "short_description": "Subsidized healthcare, free mobile diagnostic clinics, and critical surgery support for vulnerable elderly citizens.",
        "description": "Our health mission ensures that no one is denied lifesaving healthcare due to financial distress. We sponsor critical treatments, medicines, assistive devices, and geriatric health checkups across underserved districts.",
        "category": "Healthcare",
        "status": "active",
        "featured": True,
        "display_order": 2,
        "target_amount": 2500000.0,
        "raised_amount": 1450000.0,
        "currency": "INR",
        "image_url": "helthcarehero.jpeg",
    },
    {
        "title": "Rural Women Skill & Livelihood",
        "slug": "women-skill-livelihood",
        "short_description": "Empowering women with vocational training, tailoring, micro-enterprise funding, and leadership development.",
        "description": "Fostering economic independence among rural women through comprehensive tailoring programs, digital literacy, self-help group financial support, and market linkage for handcrafted goods.",
        "category": "Livelihood",
        "status": "active",
        "featured": True,
        "display_order": 3,
        "target_amount": 1200000.0,
        "raised_amount": 680000.0,
        "currency": "INR",
        "image_url": "aruna_pothumarthi.jpeg",
    },
    {
        "title": "Education for Every Child",
        "slug": "education-for-every-child",
        "short_description": "Scholarships, smart classroom equipment, textbooks, and tuition assistance for underprivileged students.",
        "description": "Bridging educational disparity by supporting low-income students with books, uniforms, educational tech kits, and dedicated after-school academic mentorship centres.",
        "category": "Education",
        "status": "active",
        "featured": True,
        "display_order": 4,
        "target_amount": 2000000.0,
        "raised_amount": 1150000.0,
        "currency": "INR",
        "image_url": "heroimg1.jpeg",
    },
    {
        "title": "Youth Action Against Hunger",
        "slug": "youth-action-against-hunger",
        "short_description": "Daily nutrition programs, community food kitchens, and mid-day meal nourishment in vulnerable settlements.",
        "description": "Combating malnutrition by distributing warm, nutritionally balanced meals to destitute families, street youth, and elderly widows across urban slums and remote hamlets.",
        "category": "Nutrition",
        "status": "active",
        "featured": False,
        "display_order": 5,
        "target_amount": 1000000.0,
        "raised_amount": 420000.0,
        "currency": "INR",
        "image_url": "office.jpeg",
    },
    {
        "title": "Emergency Disaster Relief Care",
        "slug": "emergency-disaster-relief",
        "short_description": "Rapid response food packages, emergency shelter, and hygiene kits during cyclones, floods, and natural disasters.",
        "description": "Mobilizing emergency humanitarian response teams with dry ration kits, water purification tablets, medical first-aid, and temporary shelter kits during catastrophic weather emergencies.",
        "category": "Disaster Relief",
        "status": "active",
        "featured": False,
        "display_order": 6,
        "target_amount": 1800000.0,
        "raised_amount": 910000.0,
        "currency": "INR",
        "image_url": "shelterhero.jpeg",
    },
    {
        "title": "Sustainable Community Shelter",
        "slug": "community-shelter",
        "short_description": "Durable roof repair, community hall rehabilitation, and hygienic sanitation blocks for marginalized families.",
        "description": "Rebuilding and strengthening homes for low-income rural households vulnerable to extreme monsoon downpours and weather fluctuations.",
        "category": "Shelter",
        "status": "active",
        "featured": False,
        "display_order": 7,
        "target_amount": 1600000.0,
        "raised_amount": 730000.0,
        "currency": "INR",
        "image_url": "office2.jpeg",
    },
    {
        "title": "Eco & Environmental Conservation",
        "slug": "eco-environmental-conservation",
        "short_description": "Afforestation drives, rural waste management workshops, and decentralized renewable clean energy solutions.",
        "description": "Planting native trees, restoring groundwater lakes, promoting vertical micro-turbines and solar panels in remote un-electrified settlements.",
        "category": "Environment",
        "status": "active",
        "featured": False,
        "display_order": 8,
        "target_amount": 1400000.0,
        "raised_amount": 510000.0,
        "currency": "INR",
        "image_url": "turbines.jpeg",
    },
]


async def seed():
    print(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
    db = client[settings.DATABASE_NAME]

    try:
        await client.admin.command("ping")
        print("Connected to MongoDB successfully.")
    except Exception as e:
        print(f"ERROR: Unable to connect to MongoDB ({e}). Ensure MongoDB is running.")
        return

    now = datetime.now(timezone.utc)

    # 1. Seed Roles
    print("\n--- Seeding Roles ---")
    role_map = {}
    for r in ROLES:
        existing = await db.roles.find_one({"name": r["name"]})
        if not existing:
            res = await db.roles.insert_one({
                **r,
                "created_at": now,
                "updated_at": now,
            })
            role_map[r["name"]] = res.inserted_id
            print(f"Created role: {r['name']}")
        else:
            await db.roles.update_one(
                {"_id": existing["_id"]},
                {"$set": {"permissions": r["permissions"], "description": r["description"], "updated_at": now}}
            )
            role_map[r["name"]] = existing["_id"]
            print(f"Updated role: {r['name']}")

    # 2. Seed Users
    print("\n--- Seeding Users ---")
    default_users = [
        {
            "full_name": "Aruna Pothumarthi",
            "email": "aruna@swanturbinesfoundation.com",
            "password": "FoundationAdmin2026!",
            "role_name": "foundation_admin",
        },
        {
            "full_name": "Foundation Administrator",
            "email": "admin@swanturbinesfoundation.com",
            "password": "AdminSwan2026!#Secure",
            "role_name": "foundation_admin",
        },
        {
            "full_name": "WEBSITTER Super Admin",
            "email": "websitter@swanturbinesfoundation.com",
            "password": "WebsitterSuperAdmin2026!",
            "role_name": "super_admin",
        },
    ]

    for u in default_users:
        existing = await db.users.find_one({"email": u["email"]})
        role_id = role_map.get(u["role_name"])
        if not existing:
            await db.users.insert_one({
                "full_name": u["full_name"],
                "email": u["email"],
                "hashed_password": hash_password(u["password"]),
                "is_active": True,
                "role_ids": [role_id] if role_id else [],
                "created_at": now,
                "updated_at": now,
            })
            print(f"Created user: {u['email']} (role: {u['role_name']})")
        else:
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"role_ids": [role_id] if role_id else [], "updated_at": now}}
            )
            print(f"User already exists: {u['email']}")

    # 3. Seed Campaigns
    print("\n--- Seeding Campaigns ---")
    for camp in CAMPAIGNS:
        existing = await db.campaigns.find_one({"slug": camp["slug"]})
        if not existing:
            await db.campaigns.insert_one({
                **camp,
                "created_at": now,
                "updated_at": now,
            })
            print(f"Created campaign: {camp['title']} ({camp['slug']})")
        else:
            print(f"Campaign exists: {camp['title']}")

    print("\nSeeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
