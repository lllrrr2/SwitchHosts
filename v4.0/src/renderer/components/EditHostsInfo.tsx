/**
 * EditHosts
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { useModel } from '@@/plugin-model/useModel'
import {
  BorderOuterOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Input,
  Select,
} from '@chakra-ui/react'
import ItemIcon from '@renderer/components/ItemIcon'
import { actions, agent } from '@renderer/core/agent'
import useOnBroadcast from '@renderer/core/useOnBroadcast'
import { HostsWhereType, IHostsListObject } from '@root/common/data'
import * as hostsFn from '@root/common/hostsFn'
import { message } from 'antd'
import Transfer from '@renderer/components/Transfer'
import lodash from 'lodash'
import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import styles from './EditHostsInfo.less'

const EditHostsInfo = () => {
  const { lang } = useModel('useI18n')
  const [ hosts, setHosts ] = useState<IHostsListObject | null>(null)
  const { hosts_data, setList } = useModel('useHostsData')
  const { current_hosts, setCurrentHosts } = useModel('useCurrentHosts')
  const [ is_show, setIsShow ] = useState(false)
  const [ is_add, setIsAdd ] = useState(true)
  const [ is_refreshing, setIsRefreshing ] = useState(false)

  const onCancel = () => {
    setHosts(null)
    setIsShow(false)
  }

  const onSave = async () => {
    let data: Omit<IHostsListObject, 'id'> & { id?: string } = { ...hosts }

    const keys_to_trim = [ 'title', 'url' ]
    keys_to_trim.map(k => {
      if (data[k]) {
        data[k] = data[k].trim()
      }
    })

    if (is_add) {
      // add
      let h: IHostsListObject = {
        ...(data),
        id: uuidv4(),
      }
      let list: IHostsListObject[] = [ ...hosts_data.list, h ]
      await setList(list)
      agent.broadcast('select_hosts', h.id, 1000)

    } else if (data && data.id) {
      // edit
      let h: IHostsListObject | undefined = hostsFn.findItemById(hosts_data.list, data.id)
      if (h) {
        Object.assign(h, data)
        await setList([ ...hosts_data.list ])

        if (data.id === current_hosts?.id) {
          setCurrentHosts(h)
        }

      } else {
        // can not find by id
        setIsAdd(true)
        setTimeout(onSave, 300)
        return
      }

    } else {
      // unknow error
      alert('unknow error!')
    }

    setIsShow(false)
  }

  const onUpdate = (kv: Partial<IHostsListObject>) => {
    let obj: IHostsListObject = Object.assign({}, hosts, kv)
    setHosts(obj)
  }

  useOnBroadcast('edit_hosts_info', (hosts?: IHostsListObject) => {
    setHosts(hosts || null)
    setIsAdd(!hosts)
    setIsShow(true)
  })

  useOnBroadcast('add_new', () => {
    setHosts(null)
    setIsAdd(true)
    setIsShow(true)
  })

  useOnBroadcast('hosts_refreshed', (_hosts: IHostsListObject) => {
    if (hosts && hosts.id === _hosts.id) {
      onUpdate(lodash.pick(_hosts, [ 'last_refresh', 'last_refresh_ms' ]))
    }
  }, [ hosts ])

  const forRemote = (): React.ReactElement => {
    return (
      <>
        <div className={styles.ln}>
          <div className={styles.label}>URL</div>
          <div>
            <Input
              value={hosts?.url || ''}
              onChange={e => onUpdate({ url: e.target.value })}
              placeholder={lang.url_placeholder}
            />
          </div>
        </div>

        <div className={styles.ln}>
          <div className={styles.label}>{lang.auto_refresh}</div>
          <div>
            <Select
              value={hosts?.refresh_interval || 0}
              onChange={e => onUpdate({ refresh_interval: parseInt(e.target.value) || 0 })}
              style={{ minWidth: 120 }}
            >
              <option value={0}>{lang.never}</option>
              <option value={60}>1 {lang.minute}</option>
              <option value={60 * 5}>5 {lang.minutes}</option>
              <option value={60 * 15}>15 {lang.minutes}</option>
              <option value={60 * 60}>1 {lang.hour}</option>
              <option value={60 * 60 * 24}>24 {lang.hours}</option>
              <option value={60 * 60 * 24 * 7}>7 {lang.days}</option>
            </Select>
          </div>
          {is_add ? null : (
            <div className={styles.refresh_info}>
              <span>{lang.last_refresh}{hosts?.last_refresh || 'N/A'}</span>
              <Button
                size="small"
                variant="ghost"
                disabled={is_refreshing}
                onClick={() => {
                  if (!hosts) return

                  setIsRefreshing(true)
                  actions.refreshHosts(hosts.id)
                    .then(r => {
                      console.log(r)
                      if (!r.success) {
                        message.error(r.message || r.code || 'Error!')
                        return
                      }

                      message.success('ok')
                      onUpdate({
                        last_refresh: r.data.last_refresh,
                        last_refresh_ms: r.data.last_refresh_ms,
                      })
                    })
                    .catch(e => {
                      console.log(e)
                      message.error(e.message)
                    })
                    .finally(() => setIsRefreshing(false))
                }}
              >{lang.refresh}</Button>
            </div>
          )}
        </div>
      </>
    )
  }

  const renderTransferItem = (item: IHostsListObject): React.ReactElement => {
    return (
      <div>
        <ItemIcon where={item.where}/>
        <span style={{ marginLeft: 4 }}>{item.title || lang.untitled}</span>
      </div>
    )
  }

  const forGroup = (): React.ReactElement => {
    const list = hostsFn.flatten(hosts_data.list)

    let source_list: IHostsListObject[] = list
      .filter(item => item.where === 'local' || item.where === 'remote')
      .map(item => {
        let o = { ...item }
        o.key = o.id
        return o
      })

    let target_keys: string[] = hosts?.include || []

    return (
      <div className={styles.ln}>
        <Transfer
          dataSource={source_list}
          targetKeys={target_keys}
          render={renderTransferItem}
          onChange={(next_target_keys) => {
            onUpdate({ include: next_target_keys })
          }}
        />
      </div>
    )
  }

  const forFolder = (): React.ReactElement => {
    return (
      <div className={styles.ln}>
        <div className={styles.label}>{lang.choice_mode}</div>
        <div>
          {/*<Radio.Group*/}
          {/*  value={hosts?.folder_mode || 0}*/}
          {/*  onChange={e => onUpdate({ folder_mode: e.target.value })}*/}
          {/*>*/}
          {/*  <Radio.Button value={0}><BorderOuterOutlined/> {lang.choice_mode_default}</Radio.Button>*/}
          {/*  <Radio.Button value={1}><CheckCircleOutlined/> {lang.choice_mode_single}</Radio.Button>*/}
          {/*  <Radio.Button value={2}><CheckSquareOutlined/> {lang.choice_mode_multiple}*/}
          {/*  </Radio.Button>*/}
          {/*</Radio.Group>*/}
        </div>
      </div>
    )
  }

  const wheres: HostsWhereType[] = [ 'local', 'remote', 'group', 'folder' ]

  const footer_buttons = (
    <>
      {
        is_add ? null : (
          <Button
            leftIcon={<DeleteOutlined/>}
            mr={3}
            variant="outline"
            disabled={!hosts}
            colorScheme="pink"
            onClick={() => {
              if (hosts) {
                agent.broadcast('move_to_trashcan', hosts.id)
                onCancel()
              }
            }}
          >{lang.move_to_trashcan}</Button>
        )
      }
      <Button onClick={onCancel} mr={3}>{lang.btn_cancel}</Button>
      <Button onClick={onSave} colorScheme="blue">{lang.btn_ok}</Button>
    </>
  )

  return (
    <Modal
      isOpen={is_show}
      onClose={onCancel}
      closeOnOverlayClick={false}
    >
      <ModalOverlay/>
      <ModalContent>
        <ModalHeader>{is_add ? lang.hosts_add : lang.hosts_edit}</ModalHeader>
        <ModalCloseButton/>
        <ModalBody pb={6}>
          <div className={styles.ln}>
            <div className={styles.label}>{lang.hosts_type}</div>
            <div>
              <RadioGroup
                onChange={(where: HostsWhereType) => onUpdate({ where })}
                value={hosts?.where || 'local'}
              >
                <Stack direction="row">
                  {
                    wheres.map(where => (
                      <Radio value={where} key={where} isDisabled={!is_add}>
                        <ItemIcon where={where}/> {lang[where]}
                      </Radio>
                    ))
                  }
                </Stack>
              </RadioGroup>
            </div>
          </div>

          <div className={styles.ln}>
            <div className={styles.label}>{lang.hosts_title}</div>
            <div>
              <Input value={hosts?.title || ''}
                     onChange={e => onUpdate({ title: e.target.value })}/>
            </div>
          </div>

          {hosts?.where === 'remote' ? forRemote() : null}
          {hosts?.where === 'group' ? forGroup() : null}
          {hosts?.where === 'folder' ? forFolder() : null}
        </ModalBody>

        <ModalFooter>
          {footer_buttons}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default EditHostsInfo
