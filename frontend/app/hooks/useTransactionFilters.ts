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
  payer: string;
  paymentMethod: string;
  search: string;
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
    payer: string,
    paymentMethod: string,
    search: string
  ) => void;
}

export function useTransactionFilters(): UseTransactionFiltersResult {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [payer, setPayer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleFilterChange = useCallback(
    (
      newFrom: string,
      newTo: string,
      newCategory: string,
      newGroup: string,
      newPayer: string,
      newPaymentMethod: string,
      newSearch: string
    ) => {
      setPage(1);
      setFrom(newFrom);
      setTo(newTo);
      setCategory(newCategory);
      setGroup(newGroup);
      setPayer(newPayer);
      setPaymentMethod(newPaymentMethod);
      setSearch(newSearch);
    },
    []
  );

  const filters = useMemo(
    () => ({ from, to, category, group, payer, paymentMethod, search }),
    [from, to, category, group, payer, paymentMethod, search]
  );

  return {
    filters,
    page,
    setPage,
    handleFilterChange,
  };
}
