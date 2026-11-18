from datetime import datetime
from typing import Any, Optional


class QueryBuilder:
    """
    Parameterized PostgreSQL WHERE / ORDER BY / LIMIT-OFFSET builder
    preventing SQL injection and supporting 7.4M+ event filtering.
    """

    def __init__(self) -> None:
        self.conditions: list[str] = []
        self.params: list[Any] = []

    def _add_param(self, value: Any) -> int:
        self.params.append(value)
        return len(self.params)

    def equals(self, column: str, value: Any) -> None:
        if value is None:
            return
        idx = self._add_param(value)
        self.conditions.append(f"{column} = ${idx}")

    def contains(self, column: str, value: Optional[str]) -> None:
        if not value:
            return
        idx = self._add_param(f"%{value}%")
        self.conditions.append(f"{column} ILIKE ${idx}")

    def in_list(self, column: str, values: Optional[list[Any]]) -> None:
        if not values:
            return
        idx = self._add_param(values)
        self.conditions.append(f"{column} = ANY(${idx})")

    def boolean(self, column: str, value: Optional[bool]) -> None:
        if value is None:
            return
        idx = self._add_param(value)
        self.conditions.append(f"{column} = ${idx}")

    def date_range(
        self,
        column: str,
        start: Optional[datetime],
        end: Optional[datetime],
    ) -> None:
        if start is not None:
            idx = self._add_param(start)
            self.conditions.append(f"{column} >= ${idx}")
        if end is not None:
            idx = self._add_param(end)
            self.conditions.append(f"{column} <= ${idx}")

    def raw(self, clause: str) -> None:
        if clause:
            self.conditions.append(clause)

    def valid_users_only(self, alias: str = "s") -> None:
        self.conditions.append(
            f"{alias}.employee_id IS NOT NULL AND {alias}.total_success_count >= 1"
        )

    def unmapped_users_only(self, alias: str = "s") -> None:
        self.conditions.append(f"{alias}.employee_id IS NULL")

    def invalid_devices_only(self, alias: str = "s") -> None:
        self.conditions.append(
            f"{alias}.employee_id IS NULL AND {alias}.total_success_count = 0"
        )

    def build_where(self) -> str:
        if not self.conditions:
            return ""
        return " WHERE " + " AND ".join(f"({c})" for c in self.conditions)

    @staticmethod
    def build_order_by(
        sort_by: Optional[str],
        sort_order: str = "desc",
        column_map: Optional[dict[str, str]] = None,
        default_order: str = "",
    ) -> str:
        if not sort_by:
            return f" ORDER BY {default_order}" if default_order else ""

        if column_map is not None:
            sql_col = column_map.get(sort_by)
            if not sql_col:
                return f" ORDER BY {default_order}" if default_order else ""
        else:
            sql_col = sort_by

        direction = "DESC" if sort_order.lower() == "desc" else "ASC"
        return f" ORDER BY {sql_col} {direction}"

    def build_pagination(self, page: int, page_size: int) -> str:
        offset = (max(page, 1) - 1) * page_size
        limit_idx = self._add_param(page_size)
        offset_idx = self._add_param(offset)
        return f" LIMIT ${limit_idx} OFFSET ${offset_idx}"
