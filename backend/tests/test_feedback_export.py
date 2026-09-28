import json

from conftest import login
from test_flow import API, start


def test_feedback_dataset_requires_staff_and_final_review(client):
    trainee = login(client)
    teacher = login(client, "instructor")
    card = start(client, trainee)
    endpoint = API + "/instructor/dataset.jsonl"
    assert client.get(endpoint, headers=trainee).status_code == 403
    assert not client.get(endpoint, headers=teacher).text
    original = client.post(API + f"/simulation/sessions/{card['session_id']}/finish", headers=trainee).json()
    feedback = API + f"/instructor/sessions/{card['session_id']}/feedback"
    client.post(feedback, headers=teacher, json={"verdict": "corrected", "comment": "Уточнить причину решения"})
    row = json.loads(client.get(endpoint, headers=teacher).text)
    assert row["evaluation"] == original
    assert row["instructor_feedback"][-1]["verdict"] == "corrected"
    assert "trainee" not in row and "caller_number" not in row
    client.post(
        feedback, headers=teacher, json={"verdict": "review_required", "comment": "Требуется повторная проверка"}
    )
    assert not client.get(endpoint, headers=teacher).text
