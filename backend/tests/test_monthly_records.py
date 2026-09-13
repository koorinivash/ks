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


async def test_payment_date_preserved_when_editing_amount(client):
    person_id = await _create_person(client)
    created = await client.post("/api/monthly-records", json={
        "person_id": person_id, "month": 8, "year": 2026,
        "amount": 1000, "paid_amount": 400,
        "payment_date": "2026-09-13T12:00:00.000Z",
    })
    assert created.status_code == 201
    record = created.json()
    saved = await client.get(f"/api/monthly-records/{record['id']}")
    assert saved.status_code == 200
    updated = await client.put(
        f"/api/monthly-records/{record['id']}", json={"paid_amount": 1000}
    )
    assert updated.status_code == 200
    assert updated.json()["payment_date"] == saved.json()["payment_date"]
    assert updated.json()["payment_date"].startswith("2026-09-13")
    assert updated.json()["month"] == 8


async def test_last_payment_uses_payment_date_instead_of_billing_month(client):
    person_id = await _create_person(client)
    for month, payment_date in [(9, "2026-09-01"), (8, "2026-09-13")]:
        response = await client.post("/api/monthly-records", json={
            "person_id": person_id, "month": month, "year": 2026,
            "amount": 1000, "paid_amount": 1000,
            "payment_date": f"{payment_date}T12:00:00.000Z",
        })
        assert response.status_code == 201
    person = await client.get(f"/api/people/{person_id}")
    assert person.status_code == 200
    assert person.json()["last_payment_date"].startswith("2026-09-13")
