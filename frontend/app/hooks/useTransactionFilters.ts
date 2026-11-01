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
  notInBudget: boolean;
}

interface UseTransactionFiltersResult {
  filters: TransactionFilters;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  handleNotInBudgetChange: (notInBudget: boolean) => void;
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
  const [notInBudget, setNotInBudget] = useState(false);
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

  const handleNotInBudgetChange = useCallback((value: boolean) => {
    setPage(1);
    setNotInBudget(value);
  }, []);

  const filters = useMemo(
    () => ({ from, to, category, group, payer, paymentMethod, search, notInBudget }),
    [from, to, category, group, payer, paymentMethod, search, notInBudget]
  );

  return {
    filters,
    page,
    setPage,
    handleNotInBudgetChange,
    handleFilterChange,
  };
}
