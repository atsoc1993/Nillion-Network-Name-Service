import type { Keplr } from "@keplr-wallet/provider-extension";
import { createContext } from "react";


type KeplrCtxType = [Keplr | undefined, React.Dispatch<React.SetStateAction<Keplr | undefined>> | undefined]

export const KeplrContext = createContext<KeplrCtxType>([undefined, undefined])