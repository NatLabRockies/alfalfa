import datetime

import pytest
from alfalfa_client.alfalfa_client import AlfalfaClient

from tests.integration.conftest import prepare_model


@pytest.mark.integration
def test_python_environment(client: AlfalfaClient):
    zip_file_path = prepare_model("small_office")
    model_id = client.submit(zip_file_path)

    client.wait(model_id, "ready")
    start_dt = datetime.datetime(2019, 1, 2, 0, 2, 0)
    client.start(
        model_id,
        external_clock=False,
        start_datetime=start_dt,
        end_datetime=datetime.datetime(2019, 1, 3, 0, 0, 0),
        timescale=1,
    )

    client.wait(model_id, "running")

    client.advance([model_id])

    client.stop(model_id)
    client.wait(model_id, "complete")


@pytest.mark.integration
def test_io_enable_disable(client: AlfalfaClient):
    zip_file_path = prepare_model("small_office")
    site_id = client.submit(zip_file_path)

    client.wait(site_id, "ready")
    start_dt = datetime.datetime(2019, 1, 2, 0, 2, 0)
    client.start(
        site_id,
        external_clock=True,
        start_datetime=start_dt,
        end_datetime=datetime.datetime(2019, 1, 3, 0, 0, 0),
        timescale=1,
    )

    inputs = client.get_inputs(site_id)
    outputs = client.get_outputs(site_id)

    # This is an Actuator
    assert "OfficeSmall HTGSETP_SCH_NO_OPTIMUM" in inputs
    # This is a Global Variable
    assert "Python Input" in inputs, "'Python Input' not found in 'inputs'"
    # This is an Output Variable
    assert "OfficeSmall HTGSETP_SCH_NO_OPTIMUM" in outputs.keys()
    # This is a Global Variable
    assert "Python Output" in outputs.keys(), "'Python Output' not found in 'outputs'"

    inputs = {"OfficeSmall HTGSETP_SCH_NO_OPTIMUM": 0, "Python Input": 20}
    client.set_inputs(site_id, inputs)

    for _ in range(5):
        client.advance(site_id)

        outputs = client.get_outputs(site_id)
        assert outputs["OfficeSmall HTGSETP_SCH_NO_OPTIMUM"] == pytest.approx(0)
        assert outputs["Python Output"] == pytest.approx(20), (
            "'Python Output' has incorrect value"
        )

    inputs = {"OfficeSmall HTGSETP_SCH_NO_OPTIMUM": None, "Python Input": 0}
    client.set_inputs(site_id, inputs)
    client.advance(site_id)

    outputs = client.get_outputs(site_id)
    assert outputs["OfficeSmall HTGSETP_SCH_NO_OPTIMUM"] != pytest.approx(0)
    assert outputs["Python Output"] == pytest.approx(0)

    client.stop(site_id)
    client.wait(site_id, "complete")
