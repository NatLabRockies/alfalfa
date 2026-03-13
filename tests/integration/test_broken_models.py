import datetime

import pytest
from alfalfa_client.alfalfa_client import AlfalfaClient
from alfalfa_client.lib import AlfalfaException, create_zip


@pytest.mark.integration
def test_broken_models(broken_model_path, client: AlfalfaClient):
    with pytest.raises(AlfalfaException):
        run_id = client.submit(str(broken_model_path))
        client.start(
            run_id,
            external_clock=True,
            start_datetime=datetime.datetime(2019, 1, 2, 0, 2, 0),
            end_datetime=datetime.datetime(2019, 1, 3, 0, 0, 0),
        )

        for _ in range(5):
            client.advance(run_id)

        client.stop(run_id)


@pytest.mark.integration
def test_broken_python_models(client: AlfalfaClient, broken_workflow_name):
    model_zip_path = create_zip(
        "tests/integration/broken_models/small_office/measures",
        "tests/integration/broken_models/small_office/weather",
        "tests/integration/broken_models/small_office/small_office.osm",
        f"tests/integration/broken_models/small_office/{broken_workflow_name}",
    )
    with pytest.raises(AlfalfaException):
        run_id = client.submit(model_zip_path)
        client.start(
            run_id,
            external_clock=True,
            start_datetime=datetime.datetime(2019, 1, 2, 0, 2, 0),
            end_datetime=datetime.datetime(2019, 1, 3, 0, 0, 0),
        )

        for _ in range(5):
            client.advance(run_id)

        client.stop(run_id)
