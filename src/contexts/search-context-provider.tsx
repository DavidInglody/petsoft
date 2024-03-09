"use client";

import { createContext, useState } from "react";

type TSearchContext = {
  searchText: string;
  handleChangeSearchText: (text: string) => void;
};

export const SearchContext = createContext<TSearchContext | null>(null);

export default function SearchContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // state
  const [searchText, setSearchText] = useState("");

  // event handlers/actions
  const handleChangeSearchText = (text: string) => {
    setSearchText(text);
  };

  return (
    <SearchContext.Provider value={{ searchText, handleChangeSearchText }}>
      {children}
    </SearchContext.Provider>
  );
}
