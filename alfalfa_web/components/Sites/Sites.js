import React, { useEffect, useState } from "react";
import { InfoOutlined, MoreVert } from "@mui/icons-material";
import {
  Button,
  Checkbox,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel
} from "@mui/material";
import ky from "ky";
import { DateTime } from "luxon";
import { ErrorDialog } from "./ErrorDialog";
import { NoticeDialog } from "./NoticeDialog";
import { PointDialog } from "./PointDialog";
import { StartDialog } from "./StartDialog";

const columns = [
  { id: "name", label: "Name" },
  { id: "id", label: "ID" },
  { id: "status", label: "Status" },
  { id: "datetime", label: "Time" },
  { id: "uploadTimestamp", label: "Uploaded" }
];

const formatUploadTimestamp = (timestamp) => {
  if (!timestamp) return "";
  return DateTime.fromISO(timestamp).toFormat("y-LL-dd HH:mm:ss");
};

export const Sites = () => {
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [runs, setRuns] = useState([]);
  const [showErrorDialog, setShowErrorDialog] = useState(null);
  const [showNoticeDialog, setShowNoticeDialog] = useState(null);
  const [showPointDialog, setShowPointDialog] = useState(null);
  const [showStartDialog, setShowStartDialog] = useState(null);
  const [orderBy, setOrderBy] = useState(null);
  const [order, setOrder] = useState("asc");

  const validStates = {
    start: ["READY"],
    stop: ["PREPROCESSING", "STARTING", "STARTED", "RUNNING", "STOPPING"],
    remove: ["READY", "COMPLETE", "ERROR"],
    download: ["READY", "COMPLETE", "ERROR"]
  };

  const fetchRuns = async () => {
    const { payload: runs } = await ky("/api/v2/runs").json();
    setRuns(runs);
    setLoading(false);
  };

  useEffect(() => {
    fetchRuns();
    const id = setInterval(fetchRuns, 1000);

    return () => clearInterval(id);
  }, []);

  const isSelected = (runId) => selected.includes(runId);

  const selectedRuns = () => runs.filter(({ id }) => selected.includes(id));

  const isAllSelected = () => runs.length > 0 && selected.length === runs.length;

  const isSomeSelected = () => selected.length > 0 && selected.length < runs.length;

  const handleSelectAll = (event) => {
    setSelected(event.target.checked ? runs.map(({ id }) => id) : []);
  };

  const handleSort = (columnId) => {
    if (orderBy === columnId) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(columnId);
      setOrder("asc");
    }
  };

  const sortedRuns = () => {
    if (!orderBy) return runs;
    const direction = order === "asc" ? 1 : -1;
    return [...runs].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction * aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: "base" });
      }
      if (aValue < bValue) return -direction;
      if (aValue > bValue) return direction;
      return 0;
    });
  };

  const handleRowClick = (event, runId) => {
    const newSelected = selected.includes(runId) ? selected.filter((id) => id !== runId) : [...selected, runId];
    setSelected(newSelected);
  };

  const isStartButtonDisabled = () => {
    return !selectedRuns().some(({ status }) => validStates.start.includes(status));
  };

  const isStopButtonDisabled = () => {
    return !selectedRuns().some(({ status }) => validStates.stop.includes(status));
  };

  const isRemoveButtonDisabled = () => {
    return !selectedRuns().some(({ status }) => validStates.remove.includes(status));
  };

  const isDownloadButtonDisabled = () => {
    return !selectedRuns().some(({ status }) => validStates.download.includes(status));
  };

  const handleOpenErrorDialog = (event, run) => {
    event.stopPropagation();
    setShowErrorDialog(run);
  };

  const handleOpenNoticeDialog = (event, run) => {
    event.stopPropagation();
    setShowNoticeDialog(run);
  };

  const handleOpenPointDialog = (event, run) => {
    event.stopPropagation();
    setShowPointDialog(run);
  };

  const handleStartSimulation = (startDatetime, endDatetime, timescale, realtime, externalClock) => {
    selectedRuns()
      .filter(({ status }) => validStates.start.includes(status))
      .map(async ({ id }) => {
        await ky
          .post(`/api/v2/runs/${id}/start`, {
            json: {
              startDatetime,
              endDatetime,
              timescale,
              realtime,
              externalClock
            }
          })
          .json();
      });
  };

  const handleStopSimulation = () => {
    selectedRuns()
      .filter(({ status }) => validStates.stop.includes(status))
      .map(async ({ id }) => {
        await ky.post(`/api/v2/runs/${id}/stop`).json();
      });
  };

  const handleRemoveRun = () => {
    selectedRuns()
      .filter(({ status }) => validStates.remove.includes(status))
      .map(async ({ id }) => {
        await ky.delete(`/api/v2/runs/${id}`).json();
      });
  };

  const handleDownloadRun = async () => {
    const ids = selectedRuns()
      .filter(({ status }) => validStates.download.includes(status))
      .map(({ id }) => id);

    for (const id of ids) {
      location.href = `/api/v2/runs/${id}/download`;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  if (loading) return null;

  return (
    <Grid container direction="column">
      {showErrorDialog && <ErrorDialog run={showErrorDialog} onClose={() => setShowErrorDialog(null)} />}
      {showNoticeDialog && <NoticeDialog run={showNoticeDialog} onClose={() => setShowNoticeDialog(null)} />}
      {showPointDialog && <PointDialog run={showPointDialog} onClose={() => setShowPointDialog(null)} />}
      {showStartDialog && (
        <StartDialog onStartSimulation={handleStartSimulation} onClose={() => setShowStartDialog(null)} />
      )}
      <Grid item>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox checked={isAllSelected()} indeterminate={isSomeSelected()} onChange={handleSelectAll} />
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.id}>
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : "asc"}
                    onClick={() => handleSort(column.id)}>
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell>Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRuns().map((run) => {
              return (
                <TableRow
                  key={run.id}
                  selected={false}
                  style={{ cursor: "default" }}
                  onClick={(event) => handleRowClick(event, run.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={isSelected(run.id)} />
                  </TableCell>
                  <TableCell padding="none">{run.name}</TableCell>
                  <TableCell>{run.id}</TableCell>
                  <TableCell>
                    {run.status === "ERROR" && run.errorLog ? (
                      <Button
                        variant="text"
                        style={{ marginLeft: -9 }}
                        onClick={(event) => handleOpenErrorDialog(event, run)}>
                        {run.status.toUpperCase()}
                      </Button>
                    ) : (
                      run.status.toUpperCase()
                    )}
                    {run.notices && run.notices.length > 0 && (
                      <IconButton
                        size="small"
                        title="This run has notices"
                        onClick={(event) => handleOpenNoticeDialog(event, run)}>
                        <InfoOutlined fontSize="small" color="info" />
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell>{run.datetime}</TableCell>
                  <TableCell>{formatUploadTimestamp(run.uploadTimestamp)}</TableCell>
                  <TableCell>
                    <IconButton onClick={(event) => handleOpenPointDialog(event, run)}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Grid>
      <Grid item>
        <Grid container justifyContent="flex-start" alignItems="center" style={{ marginLeft: 0, paddingLeft: 16 }}>
          <Grid item>
            <Button
              variant="contained"
              disabled={isStartButtonDisabled()}
              onClick={() => setShowStartDialog(true)}
              sx={{ m: 1 }}>
              Start Test
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" disabled={isStopButtonDisabled()} onClick={handleStopSimulation} sx={{ m: 1 }}>
              Stop Test
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" disabled={isRemoveButtonDisabled()} onClick={handleRemoveRun} sx={{ m: 1 }}>
              Remove Test Case(s)
            </Button>
          </Grid>
          <Grid item>
            <Button variant="contained" disabled={isDownloadButtonDisabled()} onClick={handleDownloadRun} sx={{ m: 1 }}>
              Download Run
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};
