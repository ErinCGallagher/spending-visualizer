/**
 * Manages filter and pagination state for the transactions page.
 * Resets to page 1 whenever any filter value changes.
 */

"use client";

import { useCallback, useMemo, useState } from "react";

export interface TransactionFilters {
  from: string;
  to: string;
  category: string;
  group: string;
  groupTypeFilter: string;
  payer: string;
}

interface UseTransactionFiltersResult {
  filters: TransactionFilters;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  handleFilterChange: (
    from: string,
    to: string,
    category: string,
    group: string,
    groupType: string,
    payer: string
  ) => void;
}

export function useTransactionFilters(): UseTransactionFiltersResult {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [groupTypeFilter, setGroupTypeFilter] = useState("");
  const [payer, setPayer] = useState("");
  const [page, setPage] = useState(1);

  const handleFilterChange = useCallback(
    (
      newFrom: string,
      newTo: string,
      newCategory: string,
      newGroup: string,
      newGroupType: string,
      newPayer: string
    ) => {
      setPage(1);
      setFrom(newFrom);
      setTo(newTo);
      setCategory(newCategory);
      setGroup(newGroup);
      setGroupTypeFilter(newGroupType);
      setPayer(newPayer);
    },
    []
  );

  const filters = useMemo(
    () => ({ from, to, category, group, groupTypeFilter, payer }),
    [from, to, category, group, groupTypeFilter, payer]
  );

  return {
    filters,
    page,
    setPage,
    handleFilterChange,
  };
}
