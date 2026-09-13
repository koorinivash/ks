from app.services.finance_service import calculate_percentage, summarize_rows


def test_calculate_percentage_normal():
    assert calculate_percentage(500, 1000) == 50.0


def test_calculate_percentage_zero_expected():
    assert calculate_percentage(0, 0) == 0.0


def test_calculate_percentage_full():
    assert calculate_percentage(1000, 1000) == 100.0


def test_summarize_rows_empty():
    summary = summarize_rows([])
    assert summary["total_people"] == 0
    assert summary["expected_amount"] == 0
    assert summary["collected_amount"] == 0
    assert summary["pending_amount"] == 0
    assert summary["collection_percentage"] == 0.0


def test_summarize_rows_no_payments():
    rows = [{"expected": 1000, "paid": 0}, {"expected": 1500, "paid": 0}]
    summary = summarize_rows(rows)
    assert summary["expected_amount"] == 2500
    assert summary["collected_amount"] == 0
    assert summary["pending_amount"] == 2500
    assert summary["collection_percentage"] == 0.0


def test_summarize_rows_partial_payment():
    rows = [{"expected": 1000, "paid": 400}]
    summary = summarize_rows(rows)
    assert summary["pending_amount"] == 600
    assert summary["collection_percentage"] == 40.0


def test_summarize_rows_full_payment():
    rows = [{"expected": 1000, "paid": 1000}, {"expected": 500, "paid": 500}]
    summary = summarize_rows(rows)
    assert summary["pending_amount"] == 0
    assert summary["collection_percentage"] == 100.0


def test_summarize_rows_zero_expected_amount():
    rows = [{"expected": 0, "paid": 0}]
    summary = summarize_rows(rows)
    assert summary["collection_percentage"] == 0.0
    assert summary["pending_amount"] == 0


def test_pending_never_negative_when_overpaid():
    rows = [{"expected": 1000, "paid": 1200}]
    summary = summarize_rows(rows)
    assert summary["pending_amount"] == 0
