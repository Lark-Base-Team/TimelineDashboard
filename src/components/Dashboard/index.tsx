import './style.css';
import React, { useLayoutEffect, useMemo } from 'react';
import { dashboard as dashboardSdk, DashboardState, IConfig, IDashboard, bitable as bitableSdk, workspace, bridge } from "@lark-base-open/js-sdk";
import { Button, DatePicker, ConfigProvider, Checkbox, Row, Col, Input, Switch, Select } from '@douyinfe/semi-ui';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfig } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next/typescript/t';
import DashboardConfig from '../DashboardConfig';
import { DashboardView } from '../DashboardView';

/** 倒计时 */
export default function Dashboard() {

  const { t, i18n } = useTranslation();

  const [previewConfig, setPreviewConfig] = useState(null) as any

  // create时的默认配置
  const [config, setConfig] = useState({
    milestoneFieldId: null,
    expectedTimeFieldId: null,
    actualTimeFieldId: null,
    baseToken: null,
  })
  const [dashboard, setDashboard] = useState<IDashboard>(dashboardSdk)
  const [bitable, setBitable] = useState<typeof bitableSdk | null>(bitableSdk);
  const [isMultipleBase, setIsMultipleBase] = useState<boolean | undefined>(undefined);
  const [configLoaded, setConfigLoaded] = useState(false);

  const isCreate = dashboard.state === DashboardState.Create
  const isView = dashboard.state === DashboardState.View

  useEffect(() => {
    (async () => {
      const env = await bridge.getEnv();
      setIsMultipleBase(env.needChangeBase ?? false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (isMultipleBase && !config?.baseToken) {
        setBitable(null);
        setDashboard(dashboardSdk);
        return;
      }
      // view模式下，getBitable由于实现问题会报错，使用默认导出的bitable能保证baseToken、tableId正常渲染，先用该方式绕过
      const realBitable = (isMultipleBase && !isView)
      ? await workspace.getBitable(config.baseToken as any)
      : bitableSdk;
      setBitable(realBitable);
      setDashboard(realBitable?.dashboard || dashboardSdk);
    })();
  }, [config.baseToken, isMultipleBase]);

  useEffect(() => {
    if (isCreate) {
      setConfig({
        milestoneFieldId: null,
        expectedTimeFieldId: null,
        actualTimeFieldId: null,
        baseToken: null,
      })
    }
  }, [i18n.language, isCreate])

  /** 是否配置/创建模式下 */
  const isConfig = dashboard.state === DashboardState.Config || isCreate;

  const timer = useRef<any>()

  /** 配置用户配置 */
  const updateConfig = (res: IConfig) => {
    if (timer.current) {
      clearTimeout(timer.current)
    }
    const { customConfig, dataConditions } = res;
    if (customConfig) {
      customConfig.selectedTableId = dataConditions[0].tableId;
      setConfig({...customConfig, baseToken: dataConditions[0].baseToken } as any);
      timer.current = setTimeout(() => {
        //自动化发送截图。 预留3s给浏览器进行渲染，3s后告知服务端可以进行截图了（对域名进行了拦截，此功能仅上架部署后可用）。
        dashboard.setRendered();
      }, 3000);

    }
    setConfigLoaded(true);
  }

  useConfig(updateConfig)

  return (
    <main style={isConfig ? {backgroundColor: "var(--cbgc)"} : { borderTop: 'none' ,backgroundColor: "var(--cbgc)"}}>
      <div className='layout-view' >
        <_DashboardView
          t={t}
          config={config}
          isConfig={isConfig}
          previewConfig={previewConfig}
          bitable={bitable}
        />
      </div>
      {
        isConfig && (
          <div className='layout-cfg'>
            <ConfigPanel 
              t={t} 
              config={config} 
              setConfig={setConfig} 
              setPreviewConfig={setPreviewConfig} 
              dashboard={dashboard} 
              bitable={bitable}
              isMultipleBase={isMultipleBase}
              configLoaded={configLoaded}
            />
          </div>
        )
      }
    </main>
  )
}


interface IDashboardView {
  config: any,
  isConfig: boolean,
  previewConfig: any,
  t: TFunction<"translation", undefined>,
  bitable: typeof bitableSdk | null,
}
function _DashboardView({ config, isConfig, t, previewConfig, bitable }: IDashboardView) {
  return (
    <>
      <div className="view">
        <DashboardView config={config} isConfig={isConfig} t={t} previewConfig={previewConfig} bitable={bitable}></DashboardView>
      </div>
    </>
  );
}

function ConfigPanel(props: {
  config: any,
  setConfig: any,
  setPreviewConfig: any,
  t: TFunction<"translation", undefined>,
  dashboard: IDashboard,
  bitable: typeof bitableSdk | null,
  isMultipleBase: boolean | undefined,
  configLoaded: boolean,
}) {
  const { config, setConfig, t, setPreviewConfig, dashboard, bitable, isMultipleBase, configLoaded } = props;
  const configRef = useRef(null) as any;
  /**保存配置 */
  const onSaveConfig = () => {
    const cfg = configRef.current.handleSetConfig()

    if (!cfg) return

    const saveConfig = {
      customConfig: (()=>{const {selectedTableId, ...tmp} = cfg;return tmp})(),
      dataConditions:
        [{
          tableId: cfg.selectedTableId,
          baseToken: config.baseToken,
        }]
    } as any
    dashboard.saveConfig(saveConfig)
  }

  return (
    <>
      <div className="layout-cfg-main">
        <DashboardConfig 
          config={config} 
          setConfig={setConfig} 
          t={t} 
          ref={configRef} 
          onConfigChange={(e: any) => { setPreviewConfig(e) }}
          dashboard={dashboard}
          bitable={bitable}
          isMultipleBase={isMultipleBase}
          configLoaded={configLoaded}
        />
      </div>
      <div className="layout-cfg-btn">
        <Button type='primary' theme='solid' size='large' className='confirmButton' onClick={onSaveConfig}>{t('button.confirm')}</Button>
      </div>
    </>
  )
}