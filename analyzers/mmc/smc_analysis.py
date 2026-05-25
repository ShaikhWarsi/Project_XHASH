import pandas as pd
import numpy as np

def _fvg_local(ohlc: pd.DataFrame, join_consecutive=False) -> pd.DataFrame:
    """
    Local, corrected version of the smc.fvg function.
    This version ensures the DataFrame index is preserved.
    """
    fvg = np.where(
        (
            (ohlc["high"].shift(1) < ohlc["low"].shift(-1))
            & (ohlc["close"] > ohlc["open"])
        )
        | (
            (ohlc["low"].shift(1) > ohlc["high"].shift(-1))
            & (ohlc["close"] < ohlc["open"])
        ),
        np.where(ohlc["close"] > ohlc["open"], 1, -1),
        np.nan,
    )

    top = np.where(
        ~np.isnan(fvg),
        np.where(
            ohlc["close"] > ohlc["open"],
            ohlc["low"].shift(-1),
            ohlc["low"].shift(1),
        ),
        np.nan,
    )

    bottom = np.where(
        ~np.isnan(fvg),
        np.where(
            ohlc["close"] > ohlc["open"],
            ohlc["high"].shift(1),
            ohlc["high"].shift(-1),
        ),
        np.nan,
    )

    if join_consecutive:
        for i in range(len(fvg) - 1):
            if fvg[i] == fvg[i + 1]:
                top[i + 1] = max(top[i], top[i + 1])
                bottom[i + 1] = min(bottom[i], bottom[i + 1])
                fvg[i] = top[i] = bottom[i] = np.nan

    mitigated_index = np.zeros(len(ohlc), dtype=np.int32)
    for i in np.where(~np.isnan(fvg))[0]:
        mask = np.zeros(len(ohlc), dtype=np.bool_)
        if fvg[i] == 1:
            mask = ohlc["low"][i + 2 :] <= top[i]
        elif fvg[i] == -1:
            mask = ohlc["high"][i + 2 :] >= bottom[i]
        if np.any(mask):
            j = np.argmax(mask) + i + 2
            mitigated_index[i] = j

    mitigated_index = np.where(np.isnan(fvg), np.nan, mitigated_index)

    return pd.concat(
        [
            pd.Series(fvg, name="FVG", index=ohlc.index),
            pd.Series(top, name="Top", index=ohlc.index),
            pd.Series(bottom, name="Bottom", index=ohlc.index),
            pd.Series(mitigated_index, name="MitigatedIndex", index=ohlc.index),
        ],
        axis=1,
    )

def _liquidity_local(ohlc: pd.DataFrame, swing_highs_lows: pd.DataFrame, range_percent: float = 0.01) -> pd.DataFrame:
    """
    Local, corrected version of the smc.liquidity function.
    This version ensures the DataFrame index is preserved.
    """
    # Work on a copy so the original is not modified.
    shl = swing_highs_lows.copy()
    n = len(ohlc)
    
    # Calculate the pip range based on the overall high-low range.
    pip_range = (ohlc["high"].max() - ohlc["low"].min()) * range_percent

    # Preconvert required columns to numpy arrays.
    ohlc_high = ohlc["high"].values
    ohlc_low = ohlc["low"].values
    # Make a copy to allow in-place marking of used candidates.
    shl_HL = shl["HighLow"].values.copy()
    shl_Level = shl["Level"].values.copy()

    # Initialise output arrays with NaN (to match later replacement of zeros).
    liquidity = np.full(n, np.nan, dtype=np.float32)
    liquidity_level = np.full(n, np.nan, dtype=np.float32)
    liquidity_end = np.full(n, np.nan, dtype=np.float32)
    liquidity_swept = np.full(n, np.nan, dtype=np.float32)

    # Process bullish liquidity (HighLow == 1)
    bull_indices = np.nonzero(shl_HL == 1)[0]
    for i in bull_indices:
        # Skip if this candidate has already been used.
        if shl_HL[i] != 1:
            continue
        high_level = shl_Level[i]
        range_low = high_level - pip_range
        range_high = high_level + pip_range
        group_levels = [high_level]
        group_end = i

        # Determine the swept index:
        # Find the first candle after i where the high reaches or exceeds range_high.
        c_start = i + 1
        if c_start < n:
            cond = ohlc_high[c_start:] >= range_high
            if np.any(cond):
                swept = c_start + int(np.argmax(cond))
            else:
                swept = 0
        else:
            swept = 0

        # Iterate only over candidate indices greater than i.
        for j in bull_indices:
            if j <= i:
                continue
            # Emulate the inner loop break: if we've reached or passed the swept index, stop.
            if swept and j >= swept:
                break
            # If candidate j is within the liquidity range, add it and mark it as used.
            if shl_HL[j] == 1 and (range_low <= shl_Level[j] <= range_high):
                group_levels.append(shl_Level[j])
                group_end = j
                shl_HL[j] = 0  # mark candidate as used
        # Only record liquidity if more than one candidate is grouped.
        if len(group_levels) > 1:
            avg_level = sum(group_levels) / len(group_levels)
            liquidity[i] = 1
            liquidity_level[i] = avg_level
            liquidity_end[i] = group_end
            liquidity_swept[i] = swept

    # Process bearish liquidity (HighLow == -1)
    bear_indices = np.nonzero(shl_HL == -1)[0]
    for i in bear_indices:
        if shl_HL[i] != -1:
            continue
        low_level = shl_Level[i]
        range_low = low_level - pip_range
        range_high = low_level + pip_range
        group_levels = [low_level]
        group_end = i

        # Find the first candle after i where the low reaches or goes below range_low.
        c_start = i + 1
        if c_start < n:
            cond = ohlc_low[c_start:] <= range_low
            if np.any(cond):
                swept = c_start + int(np.argmax(cond))
            else:
                swept = 0
        else:
            swept = 0

        for j in bear_indices:
            if j <= i:
                continue
            if swept and j >= swept:
                break
            if shl_HL[j] == -1 and (range_low <= shl_Level[j] <= range_high):
                group_levels.append(shl_Level[j])
                group_end = j
                shl_HL[j] = 0
        if len(group_levels) > 1:
            avg_level = sum(group_levels) / len(group_levels)
            liquidity[i] = -1
            liquidity_level[i] = avg_level
            liquidity_end[i] = group_end
            liquidity_swept[i] = swept

    # Convert arrays to Series with the proper names.
    liq_series = pd.Series(liquidity, name="Liquidity", index=ohlc.index)
    level_series = pd.Series(liquidity_level, name="Level", index=ohlc.index)
    end_series = pd.Series(liquidity_end, name="End", index=ohlc.index)
    swept_series = pd.Series(liquidity_swept, name="Swept", index=ohlc.index)

    return pd.concat([liq_series, level_series, end_series, swept_series], axis=1)

def _swing_highs_lows_local(ohlc: pd.DataFrame, swing_length: int = 50) -> pd.DataFrame:
    """
    Local, corrected version of the smc.swing_highs_lows function.
    This version ensures the DataFrame index is preserved.
    """
    swing_length *= 2
    # set the highs to 1 if the current high is the highest high in the last 5 candles and next 5 candles
    swing_highs_lows = np.where(
        ohlc["high"]
        == ohlc["high"].shift(-(swing_length // 2)).rolling(swing_length).max(),
        1,
        np.where(
            ohlc["low"]
            == ohlc["low"].shift(-(swing_length // 2)).rolling(swing_length).min(),
            -1,
            np.nan,
        ),
    )

    _swing_max = 10000
    for _ in range(_swing_max):
        positions = np.where(~np.isnan(swing_highs_lows))[0]

        if len(positions) < 2:
            break

        current = swing_highs_lows[positions[:-1]]
        next = swing_highs_lows[positions[1:]]

        highs = ohlc["high"].iloc[positions[:-1]].values
        lows = ohlc["low"].iloc[positions[:-1]].values

        next_highs = ohlc["high"].iloc[positions[1:]].values
        next_lows = ohlc["low"].iloc[positions[1:]].values

        index_to_remove = np.zeros(len(positions), dtype=bool)

        consecutive_highs = (current == 1) & (next == 1)
        index_to_remove[:-1] |= consecutive_highs & (highs < next_highs)
        index_to_remove[1:] |= consecutive_highs & (highs >= next_highs)

        consecutive_lows = (current == -1) & (next == -1)
        index_to_remove[:-1] |= consecutive_lows & (lows > next_lows)
        index_to_remove[1:] |= consecutive_lows & (lows <= next_lows)

        if not index_to_remove.any():
            break

        swing_highs_lows[positions[index_to_remove]] = np.nan

    positions = np.where(~np.isnan(swing_highs_lows))[0]

    if len(positions) > 0:
        if swing_highs_lows[positions[0]] == 1:
            swing_highs_lows[0] = -1
        if swing_highs_lows[positions[0]] == -1:
            swing_highs_lows[0] = 1
        if swing_highs_lows[positions[-1]] == -1:
            swing_highs_lows[-1] = 1
        if swing_highs_lows[positions[-1]] == 1:
            swing_highs_lows[-1] = -1

    level = np.where(
        ~np.isnan(swing_highs_lows),
        np.where(swing_highs_lows == 1, ohlc["high"], ohlc["low"]),
        np.nan,
    )

    return pd.concat(
        [
            pd.Series(swing_highs_lows, name="HighLow", index=ohlc.index),
            pd.Series(level, name="Level", index=ohlc.index),
        ],
        axis=1,
    )

def _bos_choch_local(ohlc: pd.DataFrame, swing_highs_lows: pd.DataFrame, close_break: bool = True) -> pd.DataFrame:
    """
    Local, corrected version of the smc.bos_choch function.
    This version ensures the DataFrame index is preserved.
    """
    swing_highs_lows = swing_highs_lows.copy().reset_index(drop=True)
    ohlc = ohlc.copy().reset_index(drop=True)

    level_order = []
    highs_lows_order = []

    bos = np.zeros(len(ohlc), dtype=np.int32)
    choch = np.zeros(len(ohlc), dtype=np.int32)
    level = np.zeros(len(ohlc), dtype=np.float32)

    last_positions = []

    for i in range(len(swing_highs_lows["HighLow"])):
        if not np.isnan(swing_highs_lows["HighLow"][i]):
            level_order.append(swing_highs_lows["Level"][i])
            highs_lows_order.append(swing_highs_lows["HighLow"][i])
            if len(level_order) >= 4:
                # bullish bos
                bos[last_positions[-2]] = (
                    1
                    if (
                        np.all(highs_lows_order[-4:] == [-1, 1, -1, 1])
                        and np.all(
                            level_order[-4]
                            < level_order[-2]
                            < level_order[-3]
                            < level_order[-1]
                        )
                    )
                    else 0
                )
                level[last_positions[-2]] = (
                    level_order[-3] if bos[last_positions[-2]] != 0 else 0
                )

                # bearish bos
                bos[last_positions[-2]] = (
                    -1
                    if (
                        np.all(highs_lows_order[-4:] == [1, -1, 1, -1])
                        and np.all(
                            level_order[-4]
                            > level_order[-2]
                            > level_order[-3]
                            > level_order[-1]
                        )
                    )
                    else bos[last_positions[-2]]
                )
                level[last_positions[-2]] = (
                    level_order[-3] if bos[last_positions[-2]] != 0 else 0
                )

                # bullish choch
                choch[last_positions[-2]] = (
                    1
                    if (
                        np.all(highs_lows_order[-4:] == [-1, 1, -1, 1])
                        and np.all(
                            level_order[-1]
                            > level_order[-3]
                            > level_order[-4]
                            > level_order[-2]
                        )
                    )
                    else 0
                )
                level[last_positions[-2]] = (
                    level_order[-3]
                    if choch[last_positions[-2]] != 0
                    else level[last_positions[-2]]
                )

                # bearish choch
                choch[last_positions[-2]] = (
                    -1
                    if (
                        np.all(highs_lows_order[-4:] == [1, -1, 1, -1])
                        and np.all(
                            level_order[-1]
                            < level_order[-3]
                            < level_order[-4]
                            < level_order[-2]
                        )
                    )
                    else choch[last_positions[-2]]
                )
                level[last_positions[-2]] = (
                    level_order[-3]
                    if choch[last_positions[-2]] != 0
                    else level[last_positions[-2]]
                )

            last_positions.append(i)

    broken = np.zeros(len(ohlc), dtype=np.int32)
    for i in np.where(np.logical_or(bos != 0, choch != 0))[0]:
        mask = np.zeros(len(ohlc), dtype=np.bool_)
        # if the bos is 1 then check if the candles high has gone above the level
        if bos[i] == 1 or choch[i] == 1:
            mask = ohlc["close" if close_break else "high"][i + 2 :] > level[i]
        # if the bos is -1 then check if the candles low has gone below the level
        elif bos[i] == -1 or choch[i] == -1:
            mask = ohlc["close" if close_break else "low"][i + 2 :] < level[i]
        if np.any(mask):
            j = np.argmax(mask) + i + 2
            broken[i] = j
            # if there are any unbroken bos or choch that started before this one and ended after this one then remove them
            for k in np.where(np.logical_or(bos != 0, choch != 0))[0]:
                if k < i and broken[k] >= j:
                    bos[k] = 0
                    choch[k] = 0
                    level[k] = 0

    # remove the ones that aren't broken
    for i in np.where(
        np.logical_and(np.logical_or(bos != 0, choch != 0), broken == 0)
    )[0]:
        bos[i] = 0
        choch[i] = 0
        level[i] = 0

    # replace all the 0s with np.nan
    bos = np.where(bos != 0, bos, np.nan)
    choch = np.where(choch != 0, choch, np.nan)
    level = np.where(level != 0, level, np.nan)
    broken = np.where(broken != 0, broken, np.nan)

    bos = pd.Series(bos, name="BOS")
    choch = pd.Series(choch, name="CHOCH")
    level = pd.Series(level, name="Level")
    broken = pd.Series(broken, name="BrokenIndex")

    return pd.concat([bos, choch, level, broken], axis=1)


class SMCAnalysis:
    def __init__(self, df):
        self.df = df.copy()
        # Ensure column names are in the format expected by the library if necessary
        # Most smc functions expect a dataframe with 'open', 'high', 'low', 'close'
        if isinstance(self.df.columns, pd.MultiIndex):
            self.df.columns = self.df.columns.get_level_values(0)
        self.df.columns = [c.lower() for c in self.df.columns]

    def get_fvg(self, join_consecutive=False):
        """
        Returns a DataFrame with:
        FVG = 1 if bullish fair value gap, -1 if bearish fair value gap
        Top = the top of the fair value gap
        Bottom = the bottom of the fair value gap
        MitigatedIndex = the index of the candle that mitigated the fair value gap
        """
        return _fvg_local(self.df, join_consecutive=join_consecutive)

    def get_swing_highs_lows(self, swing_length=50):
        """
        Returns a DataFrame with:
        HighLow = 1 if swing high, -1 if swing low
        Level = the level of the swing high or low
        """
        return _swing_highs_lows_local(self.df, swing_length=swing_length)

    def get_bos_choch(self, swing_highs_lows_df, close_break=True):
        """
        Returns a DataFrame with:
        BOS = 1 if bullish break of structure, -1 if bearish break of structure
        CHOCH = 1 if bullish change of character, -1 if bearish change of character
        Level = the level of the break of structure or change of character
        BrokenIndex = the index of the candle that broke the level
        """
        result = _bos_choch_local(self.df, swing_highs_lows_df, close_break=close_break)
        result.index = self.df.index
        return result

    def get_liquidity(self, swing_highs_lows_df, range_percent=0.01):
        """
        Returns a DataFrame with:
        Liquidity = 1 if bullish liquidity, -1 if bearish liquidity
        Level = the level of the liquidity
        End = the index of the last liquidity level
        Swept = the index of the candle that swept the liquidity
        """
        return _liquidity_local(self.df, swing_highs_lows_df, range_percent=range_percent)

    def get_previous_high_low(self, time_frame="1D"):
        df = self.df.copy()
        df.index = pd.to_datetime(df.index)
        ohlc = df

        n = len(ohlc)
        previous_high = np.full(n, np.nan, dtype=np.float32)
        previous_low = np.full(n, np.nan, dtype=np.float32)
        broken_high = np.zeros(n, dtype=np.int32)
        broken_low = np.zeros(n, dtype=np.int32)

        resampled_ohlc = ohlc.resample(time_frame).agg(
            {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"}
        ).dropna()

        currently_broken_high = False
        currently_broken_low = False
        last_broken_time = None
        for i in range(n):
            resampled_previous_index = np.where(resampled_ohlc.index < ohlc.index[i])[0]
            if len(resampled_previous_index) <= 1:
                previous_high[i] = np.nan
                previous_low[i] = np.nan
                continue
            resampled_previous_index = resampled_previous_index[-2]

            if last_broken_time != resampled_previous_index:
                currently_broken_high = False
                currently_broken_low = False
                last_broken_time = resampled_previous_index

            previous_high[i] = resampled_ohlc["high"].iloc[resampled_previous_index]
            previous_low[i] = resampled_ohlc["low"].iloc[resampled_previous_index]
            currently_broken_high = ohlc["high"].iloc[i] > previous_high[i] or currently_broken_high
            currently_broken_low = ohlc["low"].iloc[i] < previous_low[i] or currently_broken_low
            broken_high[i] = 1 if currently_broken_high else 0
            broken_low[i] = 1 if currently_broken_low else 0

        return pd.concat([
            pd.Series(previous_high, name="PreviousHigh", index=ohlc.index),
            pd.Series(previous_low, name="PreviousLow", index=ohlc.index),
            pd.Series(broken_high, name="BrokenHigh", index=ohlc.index),
            pd.Series(broken_low, name="BrokenLow", index=ohlc.index),
        ], axis=1)

    def calculate_all(self, swing_length=50):
        """
        Helper method to run all analyses and return them as a dictionary.
        """
        swings = self.get_swing_highs_lows(swing_length=swing_length)
        bos_choch = self.get_bos_choch(swings)
        liquidity = self.get_liquidity(swings)
        prev_hl = self.get_previous_high_low()
        fvg = self.get_fvg()
        
        return {
            "swings": swings,
            "bos_choch": bos_choch,
            "liquidity": liquidity,
            "prev_hl": prev_hl,
            "fvg": fvg
        }
