import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import "./style.css";
import { DashboardState, FieldType, bitable as bitableSdk, bridge, workspace, dashboard as dashboardSdk } from '@lark-base-open/js-sdk';
import { Button, Input, Select, Spin, Toast } from "@douyinfe/semi-ui";
import BaseSelector from "../BaseSelector";

let isInited = false

function FieldSelect({ t, fieldList, promptTKey, fieldId, setFieldId, fieldType, placeholder, mutuallyExclusiveId, tableLoading }: any) {
  return (<>
    <div className="prompt">{t(promptTKey)}</div>
    <Select dropdownMatchSelectWidth placeholder={t(placeholder)} className="select" optionList={
      fieldList.filter((v: any, i: any) => {
        return v.fieldType == fieldType && v.fieldId != mutuallyExclusiveId
      }).map((v: any, i: any) => {
        return {
          "label": v.fieldName,
          "value": v.fieldId
        }
      })
    } onChange={(e) => {
      setFieldId(e)
    }} value={fieldId}
    disabled={tableLoading}
    renderSelectedItem={tableLoading ? () => <Spin /> : undefined}
    ></Select >
  </>
  )
}

function DashboardConfig(props: any, ref: any) {
  const { dashboard, isMultipleBase, bitable, configLoaded } = props;
  const isCreate = dashboard.state === DashboardState.Create

  const { config, setConfig, t, onConfigChange } = props;
  const [tableList, setTableList] = useState([]) as any;
  const [fieldList, setFieldList] = useState([]) as any;

  const [selectedTableId, setSelectedTableId] = useState(null) as any;
  const [milestoneFieldId, setMilestoneFieldId] = useState(null) as any;
  const [expectedTimeFieldId, setExpectedTimeFieldId] = useState(null) as any;
  const [actualTimeFieldId, setActualTimeFieldId] = useState(null) as any;
  const [tableLoading, setTableLoading] = useState(false);

   useEffect(() => {
    const getBaseToken = async () => {
      if (!configLoaded || !isMultipleBase || config?.baseToken) {
        return;
      }
      const baseList = await workspace.getBaseList({
        query: "",
        page: {
          cursor: "",
        },
      });
      const initialBaseToken = baseList?.base_list?.[0]?.token || "";
      setConfig({
        ...config,
        baseToken: initialBaseToken,
      })
    };

    getBaseToken();
  }, [isMultipleBase, configLoaded]);

  useEffect(() => {
    (async () => {
      if (!bitable) return
      setTableLoading(true);
      const tables = await bitable.base.getTableList();
      setTableList(
        await Promise.all(
          tables.map(
            async (table: any) => {
              const name = await table.getName();
              return {
                tableId: table.id,
                tableName: name
              }
            }
          )
        )
      )
      setTableLoading(false);
    })();
  }, [bitable])

  if (config)
    useEffect(() => {
      if (selectedTableId && milestoneFieldId && expectedTimeFieldId && actualTimeFieldId) {
        // 通知view部分实时渲染
        onConfigChange({
          milestoneFieldId: milestoneFieldId,
          expectedTimeFieldId: expectedTimeFieldId,
          actualTimeFieldId: actualTimeFieldId,
          selectedTableId: selectedTableId,
        })
      }
    }, [selectedTableId, milestoneFieldId, expectedTimeFieldId, actualTimeFieldId]);

  useEffect(() => {
    if (isInited) return;
    if (isCreate) { // 创建状态时设置默认值
      (async () => {
        if (!bitable) return
        const tables = await bitable.base.getTableList();
        if (tables.length == 0) return
        setSelectedTableId(tables[0].id);
        onSelect(tables[0].id, undefined)?.then((_fieldList) => {
          let _milestoneFieldId = false;
          let _expectedTimeFieldId = false;
          let _actualTimeFieldId = false;
          for (const field of _fieldList.reverse()) {
            if (!_milestoneFieldId && field.fieldType == FieldType.Text) {
              setMilestoneFieldId(field['fieldId'])
              _milestoneFieldId = true
              continue
            }
            if (field.fieldType != FieldType.DateTime) continue;
            if (!_expectedTimeFieldId) {
              setExpectedTimeFieldId(field['fieldId'])
              _expectedTimeFieldId = true
              continue
            }
            if (!_actualTimeFieldId) {
              setActualTimeFieldId(field['fieldId'])
              _actualTimeFieldId = true
            }
          }

        });

      })();
    }
    if (!config?.selectedTableId) return; // 配置状态时使用config值
    if (config.selectedTableId) setSelectedTableId(config.selectedTableId);
    dashboard.getCategories(config.selectedTableId).then((e: any) => {
      setFieldList(e)
      if (config.milestoneFieldId) setMilestoneFieldId(config.milestoneFieldId);
      if (config.expectedTimeFieldId) setExpectedTimeFieldId(config.expectedTimeFieldId);
      if (config.actualTimeFieldId) setActualTimeFieldId(config.actualTimeFieldId);
      isInited = true
    })
  }, [dashboard, bitable])

  function onSelect(value: any, option: any) {
    if (!value) return
    return (async () => {
      setMilestoneFieldId(null)
      setExpectedTimeFieldId(null)
      setActualTimeFieldId(null)
      const _fieldList = await dashboard.getCategories(value)
      setFieldList(_fieldList)
      return _fieldList
    })();
  }

  const handleBaseChange = (baseToken: string) => {
    setConfig({ ...config, baseToken })
    setSelectedTableId(null)
    setMilestoneFieldId(null)
    setExpectedTimeFieldId(null)
    setActualTimeFieldId(null)
  }

  useImperativeHandle(ref, () => ({
    handleSetConfig() {
      if (!(milestoneFieldId && expectedTimeFieldId && actualTimeFieldId)) {
        Toast.error({
          content: t('toast.error')
        })
        return false
      }
      const cfg = {
        milestoneFieldId: milestoneFieldId,
        expectedTimeFieldId: expectedTimeFieldId,
        actualTimeFieldId: actualTimeFieldId,
        selectedTableId: selectedTableId,
      }
      setConfig({ ...config, ...cfg })

      return cfg
    }
  }));

  return (
    <>
      <div style={{ background: 'transparent' }}>
        {isMultipleBase &&
          <BaseSelector
            baseToken={config.baseToken}
            onChange={handleBaseChange}
          />
        }
        <div className="prompt">{t('tableSource')}</div>
        <Select 
          placeholder={t('placeholder.pleaseSelectTable')} className="select" 
          optionList={
            tableList.map((v: any) => { return { label: v.tableName, value: v.tableId } })
          } 
          onChange={(e) => { setSelectedTableId(e) }} 
          value={selectedTableId} 
          onSelect={onSelect}
          disabled={tableLoading}
          renderSelectedItem={tableLoading ? () => <Spin /> : undefined}
        >
        </Select>

        <FieldSelect t={t} fieldList={fieldList} promptTKey='field.milestone' fieldId={milestoneFieldId} setFieldId={setMilestoneFieldId} fieldType={FieldType.Text} placeholder="placeholder.pleaseSelectField" mutuallyExclusiveId={null} tableLoading={tableLoading}></FieldSelect>
        <FieldSelect t={t} fieldList={fieldList} promptTKey='field.expectedTime' fieldId={expectedTimeFieldId} setFieldId={setExpectedTimeFieldId} fieldType={FieldType.DateTime} placeholder="placeholder.pleaseSelectDateField" mutuallyExclusiveId={actualTimeFieldId} tableLoading={tableLoading}></FieldSelect>
        <FieldSelect t={t} fieldList={fieldList} promptTKey='field.actualTime' fieldId={actualTimeFieldId} setFieldId={setActualTimeFieldId} fieldType={FieldType.DateTime} placeholder="placeholder.pleaseSelectDateField" mutuallyExclusiveId={expectedTimeFieldId} tableLoading={tableLoading}></FieldSelect>
        <div className="title">
          <div className="titlet">
            <a className="help" href="https://wingahead.feishu.cn/wiki/NjoJwa38WidGiikx8i2cyUeKnsd?from=from_copylink" target="_blank" rel="noopener noreferrer">帮助文档</a>
          </div>
        </div>
      </div>
    </>
  )
}

export default React.forwardRef(DashboardConfig)