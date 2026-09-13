import pytest


async def _create_person(client, name="Arun", amount=1000):
    resp = await client.post("/api/people", json={"name": name, "default_monthly_amount": amount})
    return resp.json()["id"]


async def test_create_payment(client):
    person_id = await _create_person(client)
    resp = await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 1000},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "paid"
    assert data["person_name"] == "Arun"


async def test_create_payment_computes_pending_status(client):
    person_id = await _create_person(client)
    resp = await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 0},
    )
    assert resp.json()["status"] == "pending"


async def test_create_payment_computes_partial_status(client):
    person_id = await _create_person(client)
    resp = await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 400},
    )
    assert resp.json()["status"] == "partial"


async def test_duplicate_record_rejected(client):
    person_id = await _create_person(client)
    payload = {"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 1000}
    resp1 = await client.post("/api/monthly-records", json=payload)
    assert resp1.status_code == 201
    resp2 = await client.post("/api/monthly-records", json=payload)
    assert resp2.status_code == 400


async def test_negative_paid_amount_rejected(client):
    person_id = await _create_person(client)
    resp = await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": -1},
    )
    assert resp.status_code == 422


async def test_get_payment(client):
    person_id = await _create_person(client)
    created = await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 1000},
    )
    record_id = created.json()["id"]
    resp = await client.get(f"/api/monthly-records/{record_id}")
    assert resp.status_code == 200


async def test_update_payment_recomputes_status(client):
    person_id = await _create_person(client)
    created = await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 0},
    )
    record_id = created.json()["id"]
    resp = await client.put(f"/api/monthly-records/{record_id}", json={"paid_amount": 1000})
    assert resp.status_code == 200
    assert resp.json()["status"] == "paid"


async def test_delete_payment(client):
    person_id = await _create_person(client)
    created = await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 1000},
    )
    record_id = created.json()["id"]
    resp = await client.delete(f"/api/monthly-records/{record_id}")
    assert resp.status_code == 204
    resp = await client.get(f"/api/monthly-records/{record_id}")
    assert resp.status_code == 404


async def test_monthly_report_uses_count_multiplier_for_expected(client):
    resp = await client.post(
        "/api/people", json={"name": "Suresh", "default_monthly_amount": 1000, "count": 3}
    )
    assert resp.status_code == 201

    report = await client.get("/api/reports/monthly", params={"month": 9, "year": 2026})
    assert report.status_code == 200
    row = next(r for r in report.json()["rows"] if r["name"] == "Suresh")
    assert row["expected"] == 3000
    assert row["status"] == "pending"


async def test_create_payment_person_not_found(client):
    resp = await client.post(
        "/api/monthly-records",
        json={
            "person_id": "64b7f9c9f9c9f9c9f9c9f9c9",
            "month": 9,
            "year": 2026,
            "amount": 1000,
            "paid_amount": 0,
        },
    )
    assert resp.status_code == 404
