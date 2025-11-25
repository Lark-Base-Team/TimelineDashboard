import React, { useEffect, useState } from "react";
import "./style.css";
import { Tooltip } from "@douyinfe/semi-ui";
// @ts-ignore
import NotFoundSVG from "../../assets/illustration_empty-neutral-no-access.svg";

let configing = false
let globalT = undefined as any

function c(className: any) {
  if (configing) {
    return className + " config"
  }
  return className
}

const stateStyleConfig = {
  finished: {
    color: "var(--finished)",
    background: "var(--bg-finished)",
    text: "已完成"
  },
  unfinished: {
    color: "var(--unfinished)",
    background: "var(--bg-unfinished)",
    text: "未完成"
  },
  overdueFinished: {
    color: "var(--overdueFinished)",
    background: "var(--bg-overdueFinished)",
    text: "逾期已完成"
  },
  overdueUnfinished: {
    color: "var(--overdueUnfinished)",
    background: "var(--bg-overdueUnfinished)",
    text: "逾期未完成"
  }
}

function abbrText(text: any) {
  if (text.length > 30)
    return text.slice(0, 30) + "...";
  return text;
}

function computeState(expectedTime: any, actualTime: any) {
  const nowTime = new Date().getTime();
  if (expectedTime && actualTime) {
    if (actualTime > expectedTime)
      return "overdueFinished";
    return "finished";
  }
  if (expectedTime && !actualTime) {
    if (expectedTime < nowTime)
      return "overdueUnfinished";
    return "unfinished";
  }
  return "unfinished";
}

function formatTime(time: any) {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
}

function Item({ milestone, expectedTime, actualTime }: any) {
  const stateStyle = stateStyleConfig[computeState(expectedTime, actualTime)]
  return (
    <div className={c("item")} style={{ '--primaryColor': stateStyle.color, '--secondaryColor': stateStyle.background } as React.CSSProperties}>
      {milestone.length > 30 ?
        <Tooltip content={milestone} position="right">
          <div className={c("milestone")}>{abbrText(milestone)}</div>
        </Tooltip> :
        <div className={c("milestone")}>{abbrText(milestone)}</div>
      }
      <div className={c("circle")}></div>
      <div className={c("state")}>{stateStyle.text}</div>
      {
        actualTime ?
          <Tooltip content={`${globalT('field.expectedTime')}: ${formatTime(expectedTime)}`} position="right">
            <div className={c("datetime")}>{formatTime(expectedTime)}</div>
          </Tooltip> :
          <div className={c("datetime")}>{formatTime(expectedTime)}</div>
      }
    </div>
  )
}

export function DashboardView(props: any) {
  const { isConfig, t, previewConfig, bitable } = props;
  globalT = t
  let config = props['config']
  if (previewConfig) {
    config = previewConfig
  }
  const [timelineData, setTimelineData] = useState([]) as any;
  const [isTableNotFound, setIsTableNotFound] = useState(false);

  useEffect(() => {
    configing = isConfig
  }, [isConfig])
  useEffect(() => {
    if (!config || !bitable) return;
    const { milestoneFieldId, expectedTimeFieldId, actualTimeFieldId, selectedTableId } = config;
    (async () => {
      if (!selectedTableId) return;

      let table;
      try {
        table = await bitable.base.getTable(selectedTableId);
      } catch (error) {
        console.log('====getTable error====', selectedTableId, bitable, error)
        setIsTableNotFound(true);
      }
      let recordIdData;
      let token;
      const dataTemp = []
      try {
        do {
        recordIdData = await table.getRecordIdListByPage(token ? {
          pageToken: token
        } : {});

        token = recordIdData.pageToken
        const recordIdList = recordIdData.recordIds
        const milestoneField = await table.getFieldById(milestoneFieldId)
        const expectedTimeField = await table.getFieldById(expectedTimeFieldId)
        const actualTimeField = await table.getFieldById(actualTimeFieldId)
        for (const recordId of recordIdList) {
          const record = await milestoneField.getValue(recordId);
          const expectedTime = await expectedTimeField.getValue(recordId);
          const actualTime = await actualTimeField.getValue(recordId);
          if (record && expectedTime) {
            dataTemp.push({ record: record[0].text, expectedTime, actualTime })
          }
        }
      } while (recordIdData.hasMore);
      } catch (error) {
        console.log('====getTableXXXX error====', selectedTableId, bitable, error)
        setIsTableNotFound(true);
      }
      // 按expectedTime排序
      dataTemp.sort((a: any, b: any) => a.expectedTime - b.expectedTime)
      setTimelineData(dataTemp)
    })()
  }, [config, bitable])

  if (!isConfig && isTableNotFound) {
    return (
      <div className={c("empty")}>
        <img className={c("illustration")} src={NotFoundSVG} />
        <div className={c("text")}>{t("无权限查看组件")}</div>
      </div>
    );
  }
  return (
    <>
      <div className={c("space")}>
        <div className={c("itemBox")}>
          <div className={c("timeline")}>
          </div>
          {timelineData.map((item: any, i: any) => <Item key={i} milestone={item.record} expectedTime={item.expectedTime} actualTime={item.actualTime} />)}
        </div>
      </div>
    </>
  )
}