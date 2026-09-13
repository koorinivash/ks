import pytest


async def test_create_person(client):
    resp = await client.post(
        "/api/people", json={"name": "Arun", "default_monthly_amount": 1000}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Arun"
    assert data["default_monthly_amount"] == 1000
    assert data["count"] == 1
    assert data["total_monthly_amount"] == 1000
    assert data["status"] == "active"


async def test_create_person_with_count_multiplies_total(client):
    resp = await client.post(
        "/api/people", json={"name": "Kumar", "default_monthly_amount": 1000, "count": 3}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["count"] == 3
    assert data["total_monthly_amount"] == 3000


async def test_create_person_rejects_zero_count(client):
    resp = await client.post(
        "/api/people", json={"name": "Ravi", "default_monthly_amount": 1000, "count": 0}
    )
    assert resp.status_code == 422


async def test_create_person_requires_name(client):
    resp = await client.post("/api/people", json={"default_monthly_amount": 1000})
    assert resp.status_code == 422


async def test_create_person_rejects_negative_amount(client):
    resp = await client.post(
        "/api/people", json={"name": "Kumar", "default_monthly_amount": -10}
    )
    assert resp.status_code == 422


async def test_get_people_list(client):
    await client.post("/api/people", json={"name": "Arun", "default_monthly_amount": 1000})
    await client.post("/api/people", json={"name": "Kumar", "default_monthly_amount": 1500})
    resp = await client.get("/api/people")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


async def test_get_single_person(client):
    created = await client.post("/api/people", json={"name": "Ravi", "default_monthly_amount": 1200})
    person_id = created.json()["id"]
    resp = await client.get(f"/api/people/{person_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ravi"


async def test_get_person_not_found(client):
    resp = await client.get("/api/people/64b7f9c9f9c9f9c9f9c9f9c9")
    assert resp.status_code == 404


async def test_get_person_invalid_id(client):
    resp = await client.get("/api/people/not-an-id")
    assert resp.status_code == 400


async def test_update_person(client):
    created = await client.post("/api/people", json={"name": "Suresh", "default_monthly_amount": 1000})
    person_id = created.json()["id"]
    resp = await client.put(f"/api/people/{person_id}", json={"default_monthly_amount": 2000})
    assert resp.status_code == 200
    assert resp.json()["default_monthly_amount"] == 2000


async def test_delete_person(client):
    created = await client.post("/api/people", json={"name": "Vijay", "default_monthly_amount": 1000})
    person_id = created.json()["id"]
    resp = await client.delete(f"/api/people/{person_id}")
    assert resp.status_code == 204
    resp = await client.get(f"/api/people/{person_id}")
    assert resp.status_code == 404


async def test_delete_person_cascades_records(client):
    created = await client.post("/api/people", json={"name": "Mani", "default_monthly_amount": 1000})
    person_id = created.json()["id"]
    await client.post(
        "/api/monthly-records",
        json={"person_id": person_id, "month": 9, "year": 2026, "amount": 1000, "paid_amount": 1000},
    )
    await client.delete(f"/api/people/{person_id}")
    resp = await client.get("/api/monthly-records", params={"person_id": person_id})
    assert resp.status_code == 200
    assert resp.json() == []
