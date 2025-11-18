import React, {
  memo,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { map, debounce } from "lodash-es";
import { Select, Spin, Tooltip } from "@douyinfe/semi-ui";
import { t } from "i18next";
import {
  IBaseInfo,
  IGetBaseListParams,
  workspace,
} from "@lark-base-open/js-sdk";
import "./style.css";

const { Option } = Select;

// 缓存上次请求的base列表，防止过多的loading
let cacheCurBases: IBaseInfo[] = [];

function DataSourceOption(props: {
  url: string;
  optName: string;
  isLabel?: boolean;
}) {
  const { url, optName, isLabel = false } = props;

  const handleClick = () => {
    window.open(url, "_blank");
  };

  const content = (
    <>
      <span className="base-selector-option-icon">
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          data-icon="FileLinkBitableOutlined"
        >
          <path
            d="M16.595 3H4v14.823c0 .814.337 1.613.966 2.216a3.53 3.53 0 0 0 2.44.961H20V6.176a3.07 3.07 0 0 0-.966-2.215A3.53 3.53 0 0 0 16.593 3ZM2 2a1 1 0 0 1 1-1h13.595a5.53 5.53 0 0 1 3.822 1.516A5.068 5.068 0 0 1 22 6.176V22a1 1 0 0 1-1 1H7.405a5.529 5.529 0 0 1-3.822-1.516A5.068 5.068 0 0 1 2 17.824V2Zm13.74 10L12 8.26l2.275-1.76L17.5 9.725 15.74 12ZM12 15.735 15.74 12l1.76 2.275-3.225 3.225L12 15.735ZM8.26 12 6.5 9.725 9.725 6.5 12 8.26 8.26 12Zm0 0L6.5 14.275 9.725 17.5 12 15.735 8.26 12Z"
            fill="currentColor"
          ></path>
        </svg>
      </span>
      <span>{optName}</span>
    </>
  );

  return (
    <div className="base-selector-option">
      <Tooltip content={optName} checkOverflow={true}>
        <div className="base-selector-option-content">{content}</div>
      </Tooltip>
      {isLabel && (
        <Tooltip content={t("跳转到多维表格")}>
          <span className="base-selector-option-link" onClick={handleClick}>
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              data-icon="WindowNewOutlined"
            >
              <path
                d="M22 3a1 1 0 0 0-1-1h-7a1 1 0 0 0 0 2h4.586l-6.293 6.293a1 1 0 0 0 1.414 1.414L20 5.414V10a1 1 0 1 0 2 0V3Z"
                fill="currentColor"
              ></path>
              <path
                d="M4 5h6v2H4v13h16v-5.5h2V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                fill="currentColor"
              ></path>
            </svg>
          </span>
        </Tooltip>
      )}
    </div>
  );
}

const BaseSelector = (props: {
  baseToken: string;
  onChange: (v: string) => void;
}) => {
  const { baseToken, onChange } = props;
  const [currentBaseToken, setCurrentBaseToken] = useState(baseToken);
  const [curBases, setCurBases] = useState<IBaseInfo[]>([]);
  const [currentCursor, setCurrentCursor] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  useEffect(() => {
    setCurrentBaseToken(baseToken);
  }, [baseToken]);

  const search = useCallback(async (value: string) => {
    const params: IGetBaseListParams = {
      query: value,
      page: {
        cursor: "",
      },
    };
    const res = await workspace.getBaseList(params);
    setCurBases([...(res?.base_list || [])]);
    setHasMore(res?.page?.hasMore ?? false);
    setCurrentCursor(res?.page?.cursor || "");
    cacheCurBases = [
      ...(res?.base_list || []),
      ...cacheCurBases.filter((item) => item.token === currentBaseToken),
    ];
  }, [cacheCurBases]);

  // 初始化
  useEffect(() => {
    (async () => {
      try {
        if (
          cacheCurBases.length >= 0 &&
          cacheCurBases.find((item) => item.token === currentBaseToken)
        ) {
          setCurBases(cacheCurBases);
        } else {
          setIsInitialLoading(true);
        }
        await search("");
      } catch (error) {
        console.error("Failed to search base:", error);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, []);

  const debounceSearch = useMemo(() => debounce(search, 300), [search]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      debounceSearch(value);
    },
    [debounceSearch]
  );

  const onVisibleChange = useCallback(
    (visible: boolean) => {
      if (visible) {
        search("");
        setSearchValue("");
      }
    },
    [search]
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const params: IGetBaseListParams = {
        query: searchValue,
        page: {
          cursor: currentCursor,
        },
      };
      const res = await workspace.getBaseList?.(params);
      setCurBases((prev) => [...prev, ...(res?.base_list || [])]);
      setHasMore(res?.page.hasMore ?? false);
      setCurrentCursor(res?.page.cursor || "");
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentCursor, hasMore, isLoadingMore, searchValue]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.nativeEvent.target as unknown as HTMLElement;
      if (isLoadingMore || !hasMore) {
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = target;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 10;
      if (isNearBottom) {
        handleLoadMore();
      }
    },
    [isLoadingMore, hasMore, handleLoadMore]
  );

  const hasResult = curBases.length > 0;

  const handleBaseChange = useCallback(
    (value: string) => {
      setCurrentBaseToken(value);
      onChange(value);
    },
    [curBases, onChange]
  );

  const showBaseName = useMemo(() => {
    return (
      currentBaseToken &&
      cacheCurBases.find((item) => item.token === currentBaseToken) &&
      !isInitialLoading
    );
  }, [currentBaseToken, cacheCurBases, isInitialLoading]);

  return (
    <div>
      <div className="prompt" style={{ display: 'flex', alignItems: 'center' }}>
        {t("多维表格")}
        <Tooltip
          content={t(
            "仅支持选择当前空间内有可编辑及以上权限的多维表格。若多维表格开启了高级权限，则需拥有可管理及以上权限"
          )}
          position="bottom"
        >
          <span className="info-icon">
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              data-icon="InfoOutlined"
            >
              <path
                d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 2C5.925 23 1 18.075 1 12S5.925 1 12 1s11 4.925 11 11-4.925 11-11 11Zm-1-7.5v-4a1 1 0 1 1 0-2h1.004c.55 0 .998.445.998.996.003 1.668-.002 3.336-.002 5.004h.5a1 1 0 1 1 0 2h-3a1 1 0 1 1 0-2h.5Zm1-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
                fill="currentColor"
              ></path>
            </svg>
          </span>
        </Tooltip>
      </div>
      <Select
        className="select"
        searchPosition="dropdown"
        filter
        remote
        dropdownMatchSelectWidth
        placeholder={t("请选择多维表格")}
        style={{
          width: "100%",
        }}
        showClear={false}
        loading={isInitialLoading}
        disabled={isInitialLoading}
        value={showBaseName ? currentBaseToken : ""}
        onListScroll={handleScroll}
        onChange={(v) => handleBaseChange(v as string)}
        onSearch={handleSearch}
        onDropdownVisibleChange={onVisibleChange}
        renderSelectedItem={() => {
          const currentBase = cacheCurBases.find((base) => base.token === currentBaseToken);
          if(!currentBase) {
            return <Spin />;
          }
          return (
            <DataSourceOption
              url={currentBase?.url ?? ""}
              optName={currentBase?.name ?? ""}
              isLabel={currentBase?.token === currentBaseToken}
            />
          );
        }}
      >
        {curBases &&
          map(curBases, (base) => (
            <Option
              key={base?.token}
              value={base?.token}
              bitable-auto-test-attr="data-source-option"
            >
              <DataSourceOption
                url={base?.url ?? ""}
                optName={base?.name ?? ""}
                isLabel={base?.token === currentBaseToken}
              />
            </Option>
          ))}
        {!hasResult && (
          <Option value="no-result" disabled style={{ cursor: "auto" }}>
            {t("暂无匹配结果")}
          </Option>
        )}
        {isLoadingMore && (
          <Option value="loading-more" style={{ textAlign: "center" }}>
            <Spin />
          </Option>
        )}
      </Select>
    </div>
  );
};

export default memo(BaseSelector);
