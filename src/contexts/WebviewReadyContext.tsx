import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';

type WebviewReadyContextType = {
  isWebviewReady: boolean;
  setIsWebviewReady: (v: boolean) => void;
};

const WebviewReadyContext = createContext<
  WebviewReadyContextType | undefined
>(undefined);

export function useWebviewReady() {
  const context = useContext(WebviewReadyContext);
  if (!context) {
    throw new Error(
      'useWebviewReady must be used within a WebviewReadyProvider'
    );
  }
  return context;
}

export function WebviewReadyProvider({ children }: { children: ReactNode }) {
  const [isWebviewReady, setIsWebviewReady] = useState(false);
  const value = useMemo(
    () => ({ isWebviewReady, setIsWebviewReady }),
    [isWebviewReady]
  );
  return (
    <WebviewReadyContext.Provider value={value}>
      {children}
    </WebviewReadyContext.Provider>
  );
}
