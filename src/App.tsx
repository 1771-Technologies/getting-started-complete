"use client";

import { Grid, useClientRowDataSource } from "@1771technologies/lytenyte-pro";
import "@1771technologies/lytenyte-pro/grid.css";
import type {
  CellRendererParams,
  Column,
  HeaderCellRendererParams,
  RowDetailRendererParams,
  SortComparatorFn,
  SortModelItem,
} from "@1771technologies/lytenyte-pro/types";
import { useId } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@1771technologies/lytenyte-pro/icons";
import { format } from "date-fns";
import { useMemo } from "react";
import clsx from "clsx";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const columns: Column<RequestData>[] = [
  {
    id: "Date",
    name: "Date",
    width: 200,
    cellRenderer: DateCell,
    type: "datetime",
  },
  { id: "Status", name: "Status", width: 100, cellRenderer: StatusCell },
  {
    id: "Method",
    name: "Method",
    width: 100,
    cellRenderer: MethodCell,
  },
  { id: "timing-phase", name: "Timing Phase", cellRenderer: TimingPhaseCell },
  { id: "Pathname", name: "Pathname", cellRenderer: PathnameCell },
  {
    id: "Latency",
    name: "Latency",
    width: 120,
    cellRenderer: LatencyCell,
    type: "number",
  },
  { id: "region", name: "Region", cellRenderer: RegionCell },
];

export default function GettingStartedDemo() {
  const ds = useClientRowDataSource<RequestData>({
    data: requestData,
  });
  const grid = Grid.useLyteNyte({
    gridId: useId(),
    columns,

    rowDetailHeight: 200,
    rowDetailRenderer: RowDetailRenderer,

    columnMarkerEnabled: true,
    columnMarker: {
      width: 40,
      cellRenderer: ({ row, grid }) => {
        const isExpanded = grid.api.rowDetailIsExpanded(row);
        return (
          <button
            className="flex items-center justify-center h-full w-[calc(100%-1px)] text-ln-gray-70 pl-2"
            onClick={() => grid.api.rowDetailToggle(row)}
          >
            {isExpanded ? (
              <ChevronDownIcon width={20} height={20} />
            ) : (
              <ChevronRightIcon width={20} height={20} />
            )}
          </button>
        );
      },
    },

    columnBase: {
      headerRenderer: Header,
    },

    rowDataSource: ds,
  });

  const view = grid.view.useValue();

  return (
    <div className="lng-grid" style={{ width: "100%", height: "400px" }}>
      <Grid.Root grid={grid}>
        <Grid.Viewport>
          <Grid.Header>
            {view.header.layout.map((row, i) => {
              return (
                <Grid.HeaderRow headerRowIndex={i} key={i}>
                  {row.map((c) => {
                    if (c.kind === "group")
                      return (
                        <Grid.HeaderGroupCell cell={c} key={c.idOccurrence} />
                      );

                    return (
                      <Grid.HeaderCell
                        cell={c}
                        key={c.column.id}
                        className="after:bg-ln-gray-20"
                      />
                    );
                  })}
                </Grid.HeaderRow>
              );
            })}
          </Grid.Header>

          <Grid.RowsContainer>
            <Grid.RowsCenter>
              {view.rows.center.map((row) => {
                if (row.kind === "full-width")
                  return <Grid.RowFullWidth row={row} key={row.id} />;

                return (
                  <Grid.Row key={row.id} row={row} accepted={["row"]}>
                    {row.cells.map((cell) => {
                      return <Grid.Cell cell={cell} key={cell.id} />;
                    })}
                  </Grid.Row>
                );
              })}
            </Grid.RowsCenter>
          </Grid.RowsContainer>
        </Grid.Viewport>
      </Grid.Root>
    </div>
  );
}

/**
 *  COMPONENTS
 */

const colors = [
  "var(--transfer)",
  "var(--dns)",
  "var(--connection)",
  "var(--ttfb)",
  "var(--tls)",
];

const customComparators: Record<string, SortComparatorFn<RequestData>> = {
  region: (left, right) => {
    if (left.kind === "branch" || right.kind === "branch") {
      if (left.kind === "branch" && right.kind === "branch") return 0;
      if (left.kind === "branch" && right.kind !== "branch") return -1;
      if (left.kind !== "branch" && right.kind === "branch") return 1;
    }
    if (!left.data || !right.data) return !left.data ? 1 : -1;

    const leftData = left.data as RequestData;
    const rightData = right.data as RequestData;

    return leftData["region.fullname"].localeCompare(
      rightData["region.fullname"]
    );
  },
  "timing-phase": (left, right) => {
    if (left.kind === "branch" || right.kind === "branch") {
      if (left.kind === "branch" && right.kind === "branch") return 0;
      if (left.kind === "branch" && right.kind !== "branch") return -1;
      if (left.kind !== "branch" && right.kind === "branch") return 1;
    }
    if (!left.data || !right.data) return !left.data ? 1 : -1;

    const leftData = left.data as RequestData;
    const rightData = right.data as RequestData;

    return leftData.Latency - rightData.Latency;
  },
};

export function Header({
  column,
  grid,
}: HeaderCellRendererParams<RequestData>) {
  const sort = grid.state.sortModel
    .useValue()
    .find((c) => c.columnId === column.id);

  const isDescending = sort?.isDescending ?? false;

  return (
    <div
      className="flex items-center px-4 w-full h-full text-sm transition-all text-ln-gray-60"
      onClick={() => {
        const current = grid.api.sortForColumn(column.id);

        if (current == null) {
          let sort: SortModelItem<RequestData>;
          const columnId = column.id;

          if (customComparators[column.id]) {
            sort = {
              columnId,
              sort: {
                kind: "custom",
                columnId,
                comparator: customComparators[column.id],
              },
            };
          } else if (column.type === "datetime") {
            sort = {
              columnId,
              sort: { kind: "date", options: { includeTime: true } },
            };
          } else if (column.type === "number") {
            sort = { columnId, sort: { kind: "number" } };
          } else {
            sort = { columnId, sort: { kind: "string" } };
          }

          grid.state.sortModel.set([sort]);
          return;
        }
        if (!current.sort.isDescending) {
          grid.state.sortModel.set([{ ...current.sort, isDescending: true }]);
        } else {
          grid.state.sortModel.set([]);
        }
      }}
    >
      {column.name ?? column.id}

      {sort && (
        <>
          {!isDescending ? (
            <ArrowUpIcon className="size-4" />
          ) : (
            <ArrowDownIcon className="size-4" />
          )}
        </>
      )}
    </div>
  );
}

export function DateCell({
  column,
  row,
  grid,
}: CellRendererParams<RequestData>) {
  const field = grid.api.columnField(column, row);

  const niceDate =
    typeof field !== "string" ? null : format(field, "MMM dd, yyyy HH:mm:ss");

  // Guard against bad values and render nothing
  if (!niceDate) return null;

  return (
    <div className="flex items-center px-4 h-full w-full text-ln-gray-100">
      {niceDate}
    </div>
  );
}

export function StatusCell({
  column,
  row,
  grid,
}: CellRendererParams<RequestData>) {
  const status = grid.api.columnField(column, row);

  // Guard against bad values
  if (typeof status !== "number") return null;

  return (
    <div
      className={clsx("flex w-full h-full items-center px-4 font-bold text-xs")}
    >
      <div
        className={clsx(
          "px-1 py-px rounded-sm",
          status < 400 && "text-ln-primary-50 bg-[#126CFF1F]",
          status >= 400 && status < 500 && "text-[#EEA760] bg-[#FF991D1C]",
          status >= 500 && "text-[#e63d3d] bg-[#e63d3d2d]"
        )}
      >
        {status}
      </div>
    </div>
  );
}

export function MethodCell({
  column,
  row,
  grid,
}: CellRendererParams<RequestData>) {
  const method = grid.api.columnField(column, row);

  // Guard against bad values
  if (typeof method !== "string") return null;

  return (
    <div
      className={clsx("flex w-full h-full items-center px-4 font-bold text-xs")}
    >
      <div
        className={clsx(
          "px-1 py-px rounded-sm",
          method === "GET" && "text-ln-primary-50 bg-[#126CFF1F]",
          (method === "PATCH" || method === "PUT" || method === "POST") &&
            "text-[#EEA760] bg-[#FF991D1C]",
          method === "DELETE" && "text-[#e63d3d] bg-[#e63d3d2d]"
        )}
      >
        {method}
      </div>
    </div>
  );
}

export function PathnameCell({
  column,
  row,
  grid,
}: CellRendererParams<RequestData>) {
  const path = grid.api.columnField(column, row);

  if (typeof path !== "string") return null;

  return (
    <div className="px-4 flex items-center w-full h-full text-ln-gray-90 text-sm">
      <div className="text-ellipsis text-nowrap w-full overflow-hidden text-ln-primary-50">
        {path}
      </div>
    </div>
  );
}

const numberFormatter = new Intl.NumberFormat("en-Us", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
export function LatencyCell({
  column,
  row,
  grid,
}: CellRendererParams<RequestData>) {
  const ms = grid.api.columnField(column, row);
  if (typeof ms !== "number") return null;

  return (
    <div className="px-4 flex items-center h-full w-full text-ln-gray-90 tabular-nums text-sm">
      <div>
        <span className="text-ln-gray-100">{numberFormatter.format(ms)}</span>
        <span className="text-ln-gray-60 text-xs">ms</span>
      </div>
    </div>
  );
}

export function RegionCell({ grid, row }: CellRendererParams<RequestData>) {
  // Only render for leaf rows and we have some data
  if (!grid.api.rowIsLeaf(row) || !row.data) return null;

  const shortName = row.data["region.shortname"];
  const longName = row.data["region.fullname"];

  return (
    <div className="w-full h-full flex items-center">
      <div className="px-4 flex items-baseline gap-2 text-sm">
        <div className="text-ln-gray-100">{shortName}</div>
        <div className="text-ln-gray-60 leading-4">{longName}</div>
      </div>
    </div>
  );
}

export function TimingPhaseCell({
  grid,
  row,
}: CellRendererParams<RequestData>) {
  // Guard against rows that are not leafs or rows that have no data.
  if (!grid.api.rowIsLeaf(row) || !row.data) return;

  const total =
    row.data["timing-phase.connection"] +
    row.data["timing-phase.dns"] +
    row.data["timing-phase.tls"] +
    row.data["timing-phase.transfer"] +
    row.data["timing-phase.ttfb"];

  const connectionPer = (row.data["timing-phase.connection"] / total) * 100;
  const dnsPer = (row.data["timing-phase.dns"] / total) * 100;
  const tlPer = (row.data["timing-phase.tls"] / total) * 100;
  const transferPer = (row.data["timing-phase.transfer"] / total) * 100;
  const ttfbPer = (row.data["timing-phase.ttfb"] / total) * 100;

  const values = [connectionPer, dnsPer, tlPer, transferPer, ttfbPer];

  return (
    <div className="flex items-center px-4 h-full w-full">
      <div className="h-4 w-full flex items-center overflow-hidden gap-px">
        {values.map((v, i) => {
          return (
            <div
              key={i}
              style={{ width: `${v}%`, background: colors[i] }}
              className={clsx("h-full rounded-sm")}
            />
          );
        })}
      </div>
    </div>
  );
}

export function RowDetailRenderer({
  row,
  grid,
}: RowDetailRendererParams<RequestData>) {
  // Guard against empty data.
  if (!grid.api.rowIsLeaf(row) || !row.data) return null;

  const total =
    row.data["timing-phase.connection"] +
    row.data["timing-phase.dns"] +
    row.data["timing-phase.tls"] +
    row.data["timing-phase.transfer"] +
    row.data["timing-phase.ttfb"];

  const connectionPer = (row.data["timing-phase.connection"] / total) * 100;
  const dnsPer = (row.data["timing-phase.dns"] / total) * 100;
  const tlPer = (row.data["timing-phase.tls"] / total) * 100;
  const transferPer = (row.data["timing-phase.transfer"] / total) * 100;
  const ttfbPer = (row.data["timing-phase.ttfb"] / total) * 100;

  return (
    <div className="flex flex-col h-full px-4 pt-[7px] pb-[20px] text-sm">
      <h3 className="text-ln-gray-60 mt-0 text-xs font-[500]">Timing Phases</h3>

      <div className="flex flex-1 pt-[6px] gap-2">
        <div className="flex-1 h-full bg-ln-gray-00 border border-ln-gray-20 rounded-[10px]">
          <div className="grid grid-cols[auto_auto_1fr]  md:grid-cols-[auto_auto_200px_auto] grid-rows-5 p-4 gap-1 gap-x-4">
            <TimingPhaseRow
              label="Transfer"
              color={colors[0]}
              msPercentage={transferPer}
              msValue={row.data["timing-phase.transfer"]}
            />
            <TimingPhaseRow
              label="DNS"
              color={colors[1]}
              msPercentage={dnsPer}
              msValue={row.data["timing-phase.dns"]}
            />
            <TimingPhaseRow
              label="Connection"
              color={colors[2]}
              msPercentage={connectionPer}
              msValue={row.data["timing-phase.connection"]}
            />
            <TimingPhaseRow
              label="TTFB"
              color={colors[3]}
              msPercentage={ttfbPer}
              msValue={row.data["timing-phase.ttfb"]}
            />
            <TimingPhaseRow
              label="TLS"
              color={colors[4]}
              msPercentage={tlPer}
              msValue={row.data["timing-phase.tls"]}
            />

            <div className="flex-1 h-full col-start-3 row-span-full">
              <TimingPhasePieChart row={row.data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimePhaseRowProps {
  readonly color: string;
  readonly msValue: number;
  readonly msPercentage: number;
  readonly label: string;
}

function TimingPhaseRow({
  color,
  msValue,
  msPercentage,
  label,
}: TimePhaseRowProps) {
  return (
    <>
      <div className="text-sm">{label}</div>
      <div className="text-sm tabular-nums">{msPercentage.toFixed(2)}%</div>
      <div className="md:flex gap-1 items-center justify-end text-sm col-start-4 hidden">
        <div>
          <span className="text-ln-gray-100">
            {numberFormatter.format(msValue)}
          </span>
          <span className="text-ln-gray-60 text-xs">ms</span>
        </div>
        <div
          className="rounded"
          style={{
            width: `${msValue}px`,
            height: "12px",
            background: color,
            display: "block",
          }}
        ></div>
      </div>
    </>
  );
}

function TimingPhasePieChart({ row }: { row: RequestData }) {
  const data = useMemo(() => {
    return [
      { subject: "Transfer", value: row["timing-phase.transfer"] },
      { subject: "DNS", value: row["timing-phase.dns"] },
      { subject: "Connection", value: row["timing-phase.connection"] },
      { subject: "TTFB", value: row["timing-phase.ttfb"] },
      { subject: "TLS", value: row["timing-phase.tls"] },
    ];
  }, [row]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          animationDuration={0}
          dataKey="value"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          data={data}
          strokeWidth={2}
          fill="#8884d8"
          cy="80%"
          cx="50%"
        >
          {data.map((d, index) => {
            return <Cell key={`cell-${d.subject}`} fill={colors[index]} />;
          })}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 *
 *  DATA
 *
 */
export type RequestData = (typeof requestData)[number];
const requestData = [
  {
    Date: "2025-08-01 10:12:04",
    Status: 200,
    Method: "GET",
    Pathname: "/",
    Latency: 51,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 0,
    "timing-phase.tls": 10,
    "timing-phase.ttfb": 9,
    "timing-phase.connection": 23,
    "timing-phase.transfer": 9,
  },
  {
    Date: "2025-08-05 12:47:16",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api",
    Latency: 62,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 14,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 11,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 31,
  },
  {
    Date: "2025-08-04 02:49:07",
    Status: 429,
    Method: "PATCH",
    Pathname: "/api/auth/login",
    Latency: 39,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 4,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 8,
    "timing-phase.connection": 9,
    "timing-phase.transfer": 13,
  },
  {
    Date: "2025-08-03 07:44:29",
    Status: 200,
    Method: "DELETE",
    Pathname: "/api/users",
    Latency: 74,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 11,
    "timing-phase.tls": 9,
    "timing-phase.ttfb": 12,
    "timing-phase.connection": 21,
    "timing-phase.transfer": 21,
  },
  {
    Date: "2025-08-01 19:21:37",
    Status: 404,
    Method: "PUT",
    Pathname: "/",
    Latency: 50,
    "region.shortname": "ord",
    "region.fullname": "Chicago",
    "timing-phase.dns": 5,
    "timing-phase.tls": 9,
    "timing-phase.ttfb": 5,
    "timing-phase.connection": 24,
    "timing-phase.transfer": 7,
  },
  {
    Date: "2025-08-06 02:08:38",
    Status: 200,
    Method: "DELETE",
    Pathname: "/metrics",
    Latency: 63,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 2,
    "timing-phase.tls": 12,
    "timing-phase.ttfb": 6,
    "timing-phase.connection": 22,
    "timing-phase.transfer": 21,
  },
  {
    Date: "2025-08-04 09:37:14",
    Status: 200,
    Method: "POST",
    Pathname: "/api/orders",
    Latency: 20,
    "region.shortname": "ord",
    "region.fullname": "Chicago",
    "timing-phase.dns": 5,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 4,
    "timing-phase.connection": 2,
    "timing-phase.transfer": 7,
  },
  {
    Date: "2025-07-30 08:40:06",
    Status: 404,
    Method: "GET",
    Pathname: "/api/users/6933",
    Latency: 73,
    "region.shortname": "lhr",
    "region.fullname": "London",
    "timing-phase.dns": 26,
    "timing-phase.tls": 7,
    "timing-phase.ttfb": 16,
    "timing-phase.connection": 15,
    "timing-phase.transfer": 9,
  },
  {
    Date: "2025-08-10 02:00:57",
    Status: 200,
    Method: "GET",
    Pathname: "/api/users",
    Latency: 51,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 12,
    "timing-phase.tls": 10,
    "timing-phase.ttfb": 13,
    "timing-phase.connection": 6,
    "timing-phase.transfer": 10,
  },
  {
    Date: "2025-08-01 09:22:07",
    Status: 200,
    Method: "PATCH",
    Pathname: "/healthz",
    Latency: 42,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 5,
    "timing-phase.tls": 1,
    "timing-phase.ttfb": 7,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 25,
  },
  {
    Date: "2025-07-30 13:04:33",
    Status: 201,
    Method: "PATCH",
    Pathname: "/api/products/4211",
    Latency: 90,
    "region.shortname": "lhr",
    "region.fullname": "London",
    "timing-phase.dns": 4,
    "timing-phase.tls": 44,
    "timing-phase.ttfb": 17,
    "timing-phase.connection": 14,
    "timing-phase.transfer": 11,
  },
  {
    Date: "2025-07-29 19:56:37",
    Status: 200,
    Method: "POST",
    Pathname: "/api/orders",
    Latency: 139,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 12,
    "timing-phase.tls": 30,
    "timing-phase.ttfb": 48,
    "timing-phase.connection": 31,
    "timing-phase.transfer": 18,
  },
  {
    Date: "2025-08-07 11:55:51",
    Status: 200,
    Method: "GET",
    Pathname: "/api/auth/refresh",
    Latency: 56,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 1,
    "timing-phase.tls": 18,
    "timing-phase.ttfb": 11,
    "timing-phase.connection": 5,
    "timing-phase.transfer": 21,
  },
  {
    Date: "2025-08-03 08:43:42",
    Status: 200,
    Method: "GET",
    Pathname: "/api",
    Latency: 98,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 11,
    "timing-phase.tls": 15,
    "timing-phase.ttfb": 35,
    "timing-phase.connection": 26,
    "timing-phase.transfer": 11,
  },
  {
    Date: "2025-08-04 23:53:16",
    Status: 200,
    Method: "DELETE",
    Pathname: "/api/users/2173",
    Latency: 117,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 40,
    "timing-phase.tls": 3,
    "timing-phase.ttfb": 9,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 61,
  },
  {
    Date: "2025-08-08 18:41:33",
    Status: 403,
    Method: "DELETE",
    Pathname: "/content/articles",
    Latency: 56,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 16,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 22,
    "timing-phase.connection": 10,
    "timing-phase.transfer": 6,
  },
  {
    Date: "2025-08-11 14:25:54",
    Status: 200,
    Method: "GET",
    Pathname: "/api/users/8636",
    Latency: 65,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 14,
    "timing-phase.tls": 17,
    "timing-phase.ttfb": 17,
    "timing-phase.connection": 8,
    "timing-phase.transfer": 9,
  },
  {
    Date: "2025-08-03 09:15:39",
    Status: 404,
    Method: "POST",
    Pathname: "/content/articles/spicy-camera",
    Latency: 66,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 11,
    "timing-phase.tls": 9,
    "timing-phase.ttfb": 9,
    "timing-phase.connection": 8,
    "timing-phase.transfer": 29,
  },
  {
    Date: "2025-08-07 08:50:33",
    Status: 200,
    Method: "GET",
    Pathname: "/metrics",
    Latency: 83,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 4,
    "timing-phase.tls": 18,
    "timing-phase.ttfb": 26,
    "timing-phase.connection": 20,
    "timing-phase.transfer": 15,
  },
  {
    Date: "2025-08-03 22:23:33",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/users/1599",
    Latency: 124,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 32,
    "timing-phase.tls": 10,
    "timing-phase.ttfb": 15,
    "timing-phase.connection": 32,
    "timing-phase.transfer": 35,
  },
  {
    Date: "2025-07-29 20:03:54",
    Status: 200,
    Method: "DELETE",
    Pathname: "/",
    Latency: 99,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 32,
    "timing-phase.tls": 19,
    "timing-phase.ttfb": 11,
    "timing-phase.connection": 12,
    "timing-phase.transfer": 25,
  },
  {
    Date: "2025-08-02 15:14:22",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api",
    Latency: 101,
    "region.shortname": "ord",
    "region.fullname": "Chicago",
    "timing-phase.dns": 18,
    "timing-phase.tls": 11,
    "timing-phase.ttfb": 9,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 59,
  },
  {
    Date: "2025-08-07 17:25:01",
    Status: 201,
    Method: "PATCH",
    Pathname: "/api/auth/refresh",
    Latency: 44,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 2,
    "timing-phase.tls": 1,
    "timing-phase.ttfb": 23,
    "timing-phase.connection": 8,
    "timing-phase.transfer": 10,
  },
  {
    Date: "2025-08-06 23:54:12",
    Status: 200,
    Method: "POST",
    Pathname: "/metrics",
    Latency: 74,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 1,
    "timing-phase.tls": 20,
    "timing-phase.ttfb": 28,
    "timing-phase.connection": 15,
    "timing-phase.transfer": 10,
  },
  {
    Date: "2025-08-08 21:50:56",
    Status: 200,
    Method: "POST",
    Pathname: "/api",
    Latency: 103,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 28,
    "timing-phase.tls": 10,
    "timing-phase.ttfb": 22,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 39,
  },
  {
    Date: "2025-08-11 16:28:05",
    Status: 200,
    Method: "GET",
    Pathname: "/api/auth/refresh",
    Latency: 54,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 17,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 16,
    "timing-phase.connection": 9,
    "timing-phase.transfer": 7,
  },
  {
    Date: "2025-08-05 12:25:46",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/users",
    Latency: 51,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 5,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 13,
    "timing-phase.connection": 16,
    "timing-phase.transfer": 12,
  },
  {
    Date: "2025-07-29 22:32:49",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/users/8416",
    Latency: 66,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 3,
    "timing-phase.tls": 22,
    "timing-phase.ttfb": 14,
    "timing-phase.connection": 22,
    "timing-phase.transfer": 5,
  },
  {
    Date: "2025-08-02 08:20:05",
    Status: 200,
    Method: "PUT",
    Pathname: "/content/articles",
    Latency: 88,
    "region.shortname": "lhr",
    "region.fullname": "London",
    "timing-phase.dns": 10,
    "timing-phase.tls": 37,
    "timing-phase.ttfb": 18,
    "timing-phase.connection": 11,
    "timing-phase.transfer": 12,
  },
  {
    Date: "2025-08-06 18:06:18",
    Status: 201,
    Method: "DELETE",
    Pathname: "/api/products",
    Latency: 32,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 7,
    "timing-phase.tls": 3,
    "timing-phase.ttfb": 4,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 14,
  },
  {
    Date: "2025-08-08 02:08:55",
    Status: 200,
    Method: "GET",
    Pathname: "/api/products/8187",
    Latency: 32,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 3,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 6,
    "timing-phase.connection": 7,
    "timing-phase.transfer": 11,
  },
  {
    Date: "2025-08-01 15:31:22",
    Status: 200,
    Method: "PUT",
    Pathname: "/",
    Latency: 64,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 12,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 17,
    "timing-phase.connection": 27,
    "timing-phase.transfer": 6,
  },
  {
    Date: "2025-08-08 06:22:01",
    Status: 400,
    Method: "GET",
    Pathname: "/search",
    Latency: 71,
    "region.shortname": "ord",
    "region.fullname": "Chicago",
    "timing-phase.dns": 2,
    "timing-phase.tls": 25,
    "timing-phase.ttfb": 17,
    "timing-phase.connection": 20,
    "timing-phase.transfer": 7,
  },
  {
    Date: "2025-08-07 16:56:28",
    Status: 404,
    Method: "PUT",
    Pathname: "/api/orders/4207",
    Latency: 97,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 10,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 32,
    "timing-phase.connection": 22,
    "timing-phase.transfer": 31,
  },
  {
    Date: "2025-07-31 18:43:37",
    Status: 200,
    Method: "DELETE",
    Pathname: "/metrics",
    Latency: 146,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 6,
    "timing-phase.tls": 0,
    "timing-phase.ttfb": 87,
    "timing-phase.connection": 28,
    "timing-phase.transfer": 25,
  },
  {
    Date: "2025-08-04 01:14:40",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/products",
    Latency: 25,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 2,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 9,
    "timing-phase.connection": 3,
    "timing-phase.transfer": 6,
  },
  {
    Date: "2025-07-30 01:44:45",
    Status: 200,
    Method: "GET",
    Pathname: "/api/orders",
    Latency: 37,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 9,
    "timing-phase.tls": 13,
    "timing-phase.ttfb": 12,
    "timing-phase.connection": 1,
    "timing-phase.transfer": 2,
  },
  {
    Date: "2025-07-31 13:03:51",
    Status: 204,
    Method: "GET",
    Pathname: "/metrics",
    Latency: 22,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 5,
    "timing-phase.tls": 4,
    "timing-phase.ttfb": 8,
    "timing-phase.connection": 1,
    "timing-phase.transfer": 4,
  },
  {
    Date: "2025-08-06 12:15:44",
    Status: 200,
    Method: "PATCH",
    Pathname: "/healthz",
    Latency: 38,
    "region.shortname": "fra",
    "region.fullname": "Frankfurt",
    "timing-phase.dns": 4,
    "timing-phase.tls": 3,
    "timing-phase.ttfb": 8,
    "timing-phase.connection": 2,
    "timing-phase.transfer": 21,
  },
  {
    Date: "2025-08-08 16:39:59",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api",
    Latency: 43,
    "region.shortname": "yyz",
    "region.fullname": "Toronto",
    "timing-phase.dns": 5,
    "timing-phase.tls": 6,
    "timing-phase.ttfb": 16,
    "timing-phase.connection": 12,
    "timing-phase.transfer": 4,
  },
  {
    Date: "2025-08-10 14:40:52",
    Status: 200,
    Method: "POST",
    Pathname: "/api/orders/8579",
    Latency: 54,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 23,
    "timing-phase.tls": 8,
    "timing-phase.ttfb": 8,
    "timing-phase.connection": 9,
    "timing-phase.transfer": 6,
  },
  {
    Date: "2025-08-07 23:00:39",
    Status: 200,
    Method: "GET",
    Pathname: "/api/products/1650",
    Latency: 91,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 9,
    "timing-phase.tls": 19,
    "timing-phase.ttfb": 26,
    "timing-phase.connection": 13,
    "timing-phase.transfer": 24,
  },
  {
    Date: "2025-08-05 18:46:05",
    Status: 503,
    Method: "DELETE",
    Pathname: "/api/users",
    Latency: 95,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 11,
    "timing-phase.tls": 35,
    "timing-phase.ttfb": 11,
    "timing-phase.connection": 14,
    "timing-phase.transfer": 24,
  },
  {
    Date: "2025-08-05 19:59:25",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/auth/refresh",
    Latency: 76,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 20,
    "timing-phase.tls": 9,
    "timing-phase.ttfb": 13,
    "timing-phase.connection": 19,
    "timing-phase.transfer": 15,
  },
  {
    Date: "2025-08-06 08:59:01",
    Status: 200,
    Method: "GET",
    Pathname: "/api/orders/8056",
    Latency: 32,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 1,
    "timing-phase.tls": 1,
    "timing-phase.ttfb": 6,
    "timing-phase.connection": 8,
    "timing-phase.transfer": 16,
  },
  {
    Date: "2025-08-09 17:47:51",
    Status: 200,
    Method: "POST",
    Pathname: "/api/auth/refresh",
    Latency: 72,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 15,
    "timing-phase.tls": 19,
    "timing-phase.ttfb": 9,
    "timing-phase.connection": 18,
    "timing-phase.transfer": 11,
  },
  {
    Date: "2025-08-03 16:57:29",
    Status: 200,
    Method: "POST",
    Pathname: "/api/users/3234",
    Latency: 58,
    "region.shortname": "fra",
    "region.fullname": "Frankfurt",
    "timing-phase.dns": 10,
    "timing-phase.tls": 12,
    "timing-phase.ttfb": 15,
    "timing-phase.connection": 8,
    "timing-phase.transfer": 13,
  },
  {
    Date: "2025-08-06 08:10:57",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/orders",
    Latency: 57,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 3,
    "timing-phase.tls": 20,
    "timing-phase.ttfb": 21,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 9,
  },
  {
    Date: "2025-08-10 06:11:31",
    Status: 500,
    Method: "PATCH",
    Pathname: "/content/articles/modern-notebook",
    Latency: 76,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 13,
    "timing-phase.tls": 19,
    "timing-phase.ttfb": 21,
    "timing-phase.connection": 5,
    "timing-phase.transfer": 18,
  },
  {
    Date: "2025-08-07 13:05:47",
    Status: 401,
    Method: "DELETE",
    Pathname: "/content/articles/vintage-camera",
    Latency: 27,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 5,
    "timing-phase.tls": 8,
    "timing-phase.ttfb": 2,
    "timing-phase.connection": 6,
    "timing-phase.transfer": 6,
  },
  {
    Date: "2025-07-31 08:57:30",
    Status: 200,
    Method: "PATCH",
    Pathname: "/content/articles/modern-camera",
    Latency: 89,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 38,
    "timing-phase.tls": 8,
    "timing-phase.ttfb": 31,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 8,
  },
  {
    Date: "2025-08-11 15:35:02",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/products/513",
    Latency: 65,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 13,
    "timing-phase.tls": 31,
    "timing-phase.ttfb": 3,
    "timing-phase.connection": 13,
    "timing-phase.transfer": 5,
  },
  {
    Date: "2025-08-11 06:13:29",
    Status: 201,
    Method: "POST",
    Pathname: "/search",
    Latency: 57,
    "region.shortname": "ord",
    "region.fullname": "Chicago",
    "timing-phase.dns": 1,
    "timing-phase.tls": 15,
    "timing-phase.ttfb": 7,
    "timing-phase.connection": 19,
    "timing-phase.transfer": 15,
  },
  {
    Date: "2025-08-08 00:00:11",
    Status: 502,
    Method: "POST",
    Pathname: "/search",
    Latency: 68,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 6,
    "timing-phase.tls": 17,
    "timing-phase.ttfb": 25,
    "timing-phase.connection": 7,
    "timing-phase.transfer": 13,
  },
  {
    Date: "2025-08-01 16:29:38",
    Status: 401,
    Method: "DELETE",
    Pathname: "/api/products/6893",
    Latency: 95,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 23,
    "timing-phase.tls": 25,
    "timing-phase.ttfb": 26,
    "timing-phase.connection": 15,
    "timing-phase.transfer": 6,
  },
  {
    Date: "2025-08-09 19:42:10",
    Status: 400,
    Method: "PATCH",
    Pathname: "/healthz",
    Latency: 54,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 27,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 14,
    "timing-phase.connection": 10,
    "timing-phase.transfer": 1,
  },
  {
    Date: "2025-08-10 22:41:42",
    Status: 204,
    Method: "PATCH",
    Pathname: "/metrics",
    Latency: 104,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 15,
    "timing-phase.tls": 10,
    "timing-phase.ttfb": 26,
    "timing-phase.connection": 29,
    "timing-phase.transfer": 24,
  },
  {
    Date: "2025-08-08 03:22:24",
    Status: 200,
    Method: "PATCH",
    Pathname: "/content/articles",
    Latency: 158,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 15,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 75,
    "timing-phase.connection": 7,
    "timing-phase.transfer": 56,
  },
  {
    Date: "2025-08-09 11:03:32",
    Status: 201,
    Method: "POST",
    Pathname: "/",
    Latency: 57,
    "region.shortname": "lhr",
    "region.fullname": "London",
    "timing-phase.dns": 3,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 6,
    "timing-phase.connection": 14,
    "timing-phase.transfer": 29,
  },
  {
    Date: "2025-08-05 13:36:47",
    Status: 404,
    Method: "DELETE",
    Pathname: "/api/auth/refresh",
    Latency: 76,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 2,
    "timing-phase.tls": 21,
    "timing-phase.ttfb": 5,
    "timing-phase.connection": 30,
    "timing-phase.transfer": 18,
  },
  {
    Date: "2025-08-09 19:53:41",
    Status: 400,
    Method: "POST",
    Pathname: "/search",
    Latency: 111,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 7,
    "timing-phase.tls": 34,
    "timing-phase.ttfb": 47,
    "timing-phase.connection": 9,
    "timing-phase.transfer": 14,
  },
  {
    Date: "2025-08-10 12:30:11",
    Status: 200,
    Method: "DELETE",
    Pathname: "/content/articles/vintage-chair",
    Latency: 37,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 10,
    "timing-phase.tls": 3,
    "timing-phase.ttfb": 14,
    "timing-phase.connection": 1,
    "timing-phase.transfer": 9,
  },
  {
    Date: "2025-08-03 18:29:20",
    Status: 200,
    Method: "GET",
    Pathname: "/content/articles/fast-lantern",
    Latency: 148,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 35,
    "timing-phase.tls": 9,
    "timing-phase.ttfb": 64,
    "timing-phase.connection": 23,
    "timing-phase.transfer": 17,
  },
  {
    Date: "2025-08-11 11:18:46",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/orders/8795",
    Latency: 56,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 5,
    "timing-phase.tls": 18,
    "timing-phase.ttfb": 8,
    "timing-phase.connection": 3,
    "timing-phase.transfer": 22,
  },
  {
    Date: "2025-08-08 06:30:15",
    Status: 400,
    Method: "DELETE",
    Pathname: "/api/products/9391",
    Latency: 293,
    "region.shortname": "fra",
    "region.fullname": "Frankfurt",
    "timing-phase.dns": 157,
    "timing-phase.tls": 51,
    "timing-phase.ttfb": 24,
    "timing-phase.connection": 31,
    "timing-phase.transfer": 30,
  },
  {
    Date: "2025-08-09 16:38:22",
    Status: 200,
    Method: "POST",
    Pathname: "/api",
    Latency: 188,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 69,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 64,
    "timing-phase.connection": 6,
    "timing-phase.transfer": 47,
  },
  {
    Date: "2025-07-31 20:10:52",
    Status: 204,
    Method: "GET",
    Pathname: "/content/articles/modern-lantern",
    Latency: 43,
    "region.shortname": "fra",
    "region.fullname": "Frankfurt",
    "timing-phase.dns": 4,
    "timing-phase.tls": 11,
    "timing-phase.ttfb": 14,
    "timing-phase.connection": 8,
    "timing-phase.transfer": 6,
  },
  {
    Date: "2025-08-06 13:02:28",
    Status: 200,
    Method: "GET",
    Pathname: "/content/articles/modern-notebook",
    Latency: 38,
    "region.shortname": "lhr",
    "region.fullname": "London",
    "timing-phase.dns": 6,
    "timing-phase.tls": 11,
    "timing-phase.ttfb": 8,
    "timing-phase.connection": 6,
    "timing-phase.transfer": 7,
  },
  {
    Date: "2025-08-03 14:28:40",
    Status: 200,
    Method: "DELETE",
    Pathname: "/api",
    Latency: 130,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 10,
    "timing-phase.tls": 27,
    "timing-phase.ttfb": 36,
    "timing-phase.connection": 20,
    "timing-phase.transfer": 37,
  },
  {
    Date: "2025-07-29 06:22:54",
    Status: 201,
    Method: "PATCH",
    Pathname: "/api/users/2611",
    Latency: 97,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 28,
    "timing-phase.tls": 14,
    "timing-phase.ttfb": 6,
    "timing-phase.connection": 31,
    "timing-phase.transfer": 18,
  },
  {
    Date: "2025-08-02 01:57:02",
    Status: 204,
    Method: "POST",
    Pathname: "/api/orders/3228",
    Latency: 55,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 0,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 17,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 32,
  },
  {
    Date: "2025-08-08 21:49:01",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/auth/login",
    Latency: 272,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 43,
    "timing-phase.tls": 39,
    "timing-phase.ttfb": 103,
    "timing-phase.connection": 14,
    "timing-phase.transfer": 73,
  },
  {
    Date: "2025-08-08 14:23:59",
    Status: 200,
    Method: "GET",
    Pathname: "/api/auth/refresh",
    Latency: 70,
    "region.shortname": "yyz",
    "region.fullname": "Toronto",
    "timing-phase.dns": 13,
    "timing-phase.tls": 22,
    "timing-phase.ttfb": 22,
    "timing-phase.connection": 5,
    "timing-phase.transfer": 8,
  },
  {
    Date: "2025-07-30 14:32:54",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/products",
    Latency: 59,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 11,
    "timing-phase.tls": 15,
    "timing-phase.ttfb": 10,
    "timing-phase.connection": 2,
    "timing-phase.transfer": 21,
  },
  {
    Date: "2025-08-02 04:58:02",
    Status: 200,
    Method: "POST",
    Pathname: "/api/auth/refresh",
    Latency: 76,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 3,
    "timing-phase.tls": 15,
    "timing-phase.ttfb": 28,
    "timing-phase.connection": 15,
    "timing-phase.transfer": 15,
  },
  {
    Date: "2025-08-08 17:36:41",
    Status: 200,
    Method: "DELETE",
    Pathname: "/metrics",
    Latency: 68,
    "region.shortname": "yyz",
    "region.fullname": "Toronto",
    "timing-phase.dns": 7,
    "timing-phase.tls": 1,
    "timing-phase.ttfb": 24,
    "timing-phase.connection": 18,
    "timing-phase.transfer": 18,
  },
  {
    Date: "2025-08-09 16:41:48",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/products/3900",
    Latency: 23,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 5,
    "timing-phase.tls": 1,
    "timing-phase.ttfb": 1,
    "timing-phase.connection": 2,
    "timing-phase.transfer": 14,
  },
  {
    Date: "2025-08-04 11:48:30",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/products",
    Latency: 100,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 11,
    "timing-phase.tls": 10,
    "timing-phase.ttfb": 29,
    "timing-phase.connection": 16,
    "timing-phase.transfer": 34,
  },
  {
    Date: "2025-07-29 19:25:56",
    Status: 401,
    Method: "DELETE",
    Pathname: "/api/users",
    Latency: 40,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 2,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 31,
    "timing-phase.connection": 0,
    "timing-phase.transfer": 2,
  },
  {
    Date: "2025-08-09 05:01:15",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/users",
    Latency: 79,
    "region.shortname": "ord",
    "region.fullname": "Chicago",
    "timing-phase.dns": 7,
    "timing-phase.tls": 9,
    "timing-phase.ttfb": 23,
    "timing-phase.connection": 25,
    "timing-phase.transfer": 15,
  },
  {
    Date: "2025-08-07 03:25:10",
    Status: 200,
    Method: "POST",
    Pathname: "/api/auth/refresh",
    Latency: 48,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 5,
    "timing-phase.tls": 5,
    "timing-phase.ttfb": 13,
    "timing-phase.connection": 7,
    "timing-phase.transfer": 18,
  },
  {
    Date: "2025-08-07 20:11:14",
    Status: 200,
    Method: "GET",
    Pathname: "/api/auth/login",
    Latency: 50,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 6,
    "timing-phase.tls": 19,
    "timing-phase.ttfb": 10,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 11,
  },
  {
    Date: "2025-07-29 16:31:48",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/orders/5956",
    Latency: 140,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 15,
    "timing-phase.tls": 56,
    "timing-phase.ttfb": 35,
    "timing-phase.connection": 17,
    "timing-phase.transfer": 17,
  },
  {
    Date: "2025-08-09 12:40:41",
    Status: 429,
    Method: "POST",
    Pathname: "/api",
    Latency: 109,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 8,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 35,
    "timing-phase.connection": 11,
    "timing-phase.transfer": 53,
  },
  {
    Date: "2025-08-09 18:43:12",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/orders/2507",
    Latency: 24,
    "region.shortname": "yyz",
    "region.fullname": "Toronto",
    "timing-phase.dns": 6,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 4,
    "timing-phase.connection": 3,
    "timing-phase.transfer": 9,
  },
  {
    Date: "2025-08-10 13:48:24",
    Status: 200,
    Method: "POST",
    Pathname: "/search",
    Latency: 50,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 6,
    "timing-phase.tls": 16,
    "timing-phase.ttfb": 10,
    "timing-phase.connection": 13,
    "timing-phase.transfer": 5,
  },
  {
    Date: "2025-07-31 23:51:12",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/users/4733",
    Latency: 24,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 1,
    "timing-phase.tls": 3,
    "timing-phase.ttfb": 10,
    "timing-phase.connection": 2,
    "timing-phase.transfer": 8,
  },
  {
    Date: "2025-07-31 23:21:38",
    Status: 200,
    Method: "GET",
    Pathname: "/api/auth/login",
    Latency: 33,
    "region.shortname": "hkg",
    "region.fullname": "Hong Kong",
    "timing-phase.dns": 1,
    "timing-phase.tls": 4,
    "timing-phase.ttfb": 8,
    "timing-phase.connection": 15,
    "timing-phase.transfer": 5,
  },
  {
    Date: "2025-08-05 20:42:45",
    Status: 200,
    Method: "PATCH",
    Pathname: "/api/users",
    Latency: 59,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 3,
    "timing-phase.tls": 1,
    "timing-phase.ttfb": 15,
    "timing-phase.connection": 29,
    "timing-phase.transfer": 11,
  },
  {
    Date: "2025-07-29 22:52:20",
    Status: 200,
    Method: "POST",
    Pathname: "/api",
    Latency: 29,
    "region.shortname": "sfo",
    "region.fullname": "San Francisco",
    "timing-phase.dns": 4,
    "timing-phase.tls": 8,
    "timing-phase.ttfb": 9,
    "timing-phase.connection": 6,
    "timing-phase.transfer": 2,
  },
  {
    Date: "2025-08-05 12:40:55",
    Status: 200,
    Method: "PATCH",
    Pathname: "/search",
    Latency: 104,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 12,
    "timing-phase.tls": 18,
    "timing-phase.ttfb": 37,
    "timing-phase.connection": 16,
    "timing-phase.transfer": 21,
  },
  {
    Date: "2025-08-01 01:07:13",
    Status: 400,
    Method: "POST",
    Pathname: "/api/users",
    Latency: 48,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 9,
    "timing-phase.tls": 2,
    "timing-phase.ttfb": 15,
    "timing-phase.connection": 8,
    "timing-phase.transfer": 14,
  },
  {
    Date: "2025-08-02 10:05:32",
    Status: 200,
    Method: "PATCH",
    Pathname: "/content/articles/spicy-notebook",
    Latency: 46,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 1,
    "timing-phase.tls": 6,
    "timing-phase.ttfb": 4,
    "timing-phase.connection": 28,
    "timing-phase.transfer": 7,
  },
  {
    Date: "2025-08-05 15:29:10",
    Status: 200,
    Method: "PUT",
    Pathname: "/",
    Latency: 45,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 1,
    "timing-phase.tls": 8,
    "timing-phase.ttfb": 26,
    "timing-phase.connection": 7,
    "timing-phase.transfer": 3,
  },
  {
    Date: "2025-08-06 05:56:36",
    Status: 404,
    Method: "DELETE",
    Pathname: "/api/auth/login",
    Latency: 90,
    "region.shortname": "yyz",
    "region.fullname": "Toronto",
    "timing-phase.dns": 12,
    "timing-phase.tls": 8,
    "timing-phase.ttfb": 47,
    "timing-phase.connection": 7,
    "timing-phase.transfer": 16,
  },
  {
    Date: "2025-08-10 04:16:29",
    Status: 403,
    Method: "POST",
    Pathname: "/",
    Latency: 52,
    "region.shortname": "syd",
    "region.fullname": "Sydney",
    "timing-phase.dns": 15,
    "timing-phase.tls": 8,
    "timing-phase.ttfb": 12,
    "timing-phase.connection": 6,
    "timing-phase.transfer": 11,
  },
  {
    Date: "2025-08-11 09:34:50",
    Status: 200,
    Method: "GET",
    Pathname: "/api/users/5997",
    Latency: 94,
    "region.shortname": "sin",
    "region.fullname": "Singapore",
    "timing-phase.dns": 2,
    "timing-phase.tls": 18,
    "timing-phase.ttfb": 33,
    "timing-phase.connection": 4,
    "timing-phase.transfer": 37,
  },
  {
    Date: "2025-08-02 00:48:48",
    Status: 404,
    Method: "PUT",
    Pathname: "/api/auth/login",
    Latency: 100,
    "region.shortname": "iad",
    "region.fullname": "Washington, D.C.",
    "timing-phase.dns": 28,
    "timing-phase.tls": 15,
    "timing-phase.ttfb": 13,
    "timing-phase.connection": 28,
    "timing-phase.transfer": 16,
  },
  {
    Date: "2025-07-30 16:01:08",
    Status: 200,
    Method: "GET",
    Pathname: "/content/articles/fast-scooter",
    Latency: 86,
    "region.shortname": "fra",
    "region.fullname": "Frankfurt",
    "timing-phase.dns": 17,
    "timing-phase.tls": 3,
    "timing-phase.ttfb": 13,
    "timing-phase.connection": 27,
    "timing-phase.transfer": 26,
  },
  {
    Date: "2025-08-04 20:31:09",
    Status: 200,
    Method: "PUT",
    Pathname: "/api/orders",
    Latency: 82,
    "region.shortname": "nyc",
    "region.fullname": "New York City",
    "timing-phase.dns": 4,
    "timing-phase.tls": 0,
    "timing-phase.ttfb": 42,
    "timing-phase.connection": 26,
    "timing-phase.transfer": 10,
  },
];
