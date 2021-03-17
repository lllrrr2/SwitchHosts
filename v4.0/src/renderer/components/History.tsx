/**
 * History
 * @author: oldj
 * @homepage: https://oldj.net
 */

import { useModel } from '@@/plugin-model/useModel'
import {
  Box,
  Button,
  Center,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  List,
  ListIcon,
  ListItem,
  Spinner,
  VStack,
} from '@chakra-ui/react'
import HostsViewer from '@renderer/components/HostsViewer'
import { actions } from '@renderer/core/agent'
import useOnBroadcast from '@renderer/core/useOnBroadcast'
import { IHostsHistoryObject } from '@root/common/data'
import dayjs from 'dayjs'
import React, { useEffect, useRef, useState } from 'react'
import { BiDetail, BiHistory, BiTrash } from 'react-icons/bi'
import prettyBytes from 'pretty-bytes'

interface IHistoryProps {
  list: IHostsHistoryObject[];
  selected_item: IHostsHistoryObject | undefined;
  setSelectedItem: (item: IHostsHistoryObject) => void;
}

const HistoryList = (props: IHistoryProps): React.ReactElement => {
  const { list, selected_item, setSelectedItem } = props
  const { lang } = useModel('useI18n')

  if (list.length === 0) {
    return (
      <Center h="100%" opacity={0.5} fontSize="lg">{lang.no_record}</Center>
    )
  }

  return (
    <Flex h="100%" minHeight="300px">
      <Box
        flex={1} mr={3}
        borderWidth="1px" borderRadius="md"
      >
        <HostsViewer
          content={selected_item ? selected_item.content : ''}
        />
      </Box>
      <List
        w="200px" h="100%" overflow="auto"
        borderWidth="1px" borderRadius="md"
      >
        {list.map((item) => (
          <ListItem
            key={item.id}
            onClick={() => setSelectedItem(item)}
            px={3}
            py={2}
            userSelect="none"
            {...(item.id === selected_item?.id ? {
              // selected style
              bg: 'var(--swh-selected-bg)',
            } : null)}
          >
            <HStack>
              <Box><BiDetail/></Box>
              <VStack align="left" spacing={0}>
                <Box>{dayjs(item.add_time_ms).format('YYYY-MM-DD HH:mm:ss')}</Box>
                <HStack lineHeight="14px" fontSize="9px" opacity={0.6}>
                  <Box>{item.content.split('\n').length} lines</Box>
                  <Box>{prettyBytes(item.content.length)}</Box>
                </HStack>
              </VStack>
            </HStack>
          </ListItem>
        ))}
      </List>
    </Flex>
  )
}

const Loading = (): React.ReactElement => {
  return (
    <Center h="300px">
      <Spinner
        speed="1s"
        emptyColor="gray.200"
        size="lg"
        mr={3}
      />
      <Box>Loading...</Box>
    </Center>
  )
}

const History = () => {
  const [ is_open, setIsOpen ] = useState(true)
  const [ is_loading, setIsLoading ] = useState(true)
  const [ list, setList ] = useState<IHostsHistoryObject[]>([])
  const [ selected_item, setSelectedItem ] = useState<IHostsHistoryObject>()
  const { lang } = useModel('useI18n')
  const btn_close = useRef(null)

  const loadData = async () => {
    // setIsLoading(true)
    let list = await actions.getHistoryList()
    list = list.reverse()
    setList(list)
    if (!selected_item) {
      setSelectedItem(list[0])
    }
    setIsLoading(false)

    return list
  }

  const onClose = () => {
    setIsOpen(false)
    setList([])
  }

  const deleteItem = async (id: string) => {
    let idx = list.findIndex(i => i.id === id)
    await actions.deleteHistory(id)
    setSelectedItem(undefined)
    let list2 = await loadData()

    let next_item = list2[idx] || list2[idx - 1]
    if (next_item) {
      setSelectedItem(next_item)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useOnBroadcast('show_history', () => {
    setIsOpen(true)
    loadData()
  })

  return (
    <Drawer
      size="lg"
      placement="right"
      isOpen={is_open}
      onClose={onClose}
      initialFocusRef={btn_close}
    >
      <DrawerOverlay>
        <DrawerContent>
          {/*<DrawerCloseButton/>*/}
          <DrawerHeader>
            <HStack>
              <Box mr={1}><BiHistory/></Box>
              <Box>{lang.system_hosts_history}</Box>
            </HStack>
          </DrawerHeader>
          <DrawerBody>
            {
              is_loading ?
                <Loading/> :
                <HistoryList
                  list={list}
                  selected_item={selected_item}
                  setSelectedItem={setSelectedItem}
                />
            }
          </DrawerBody>
          <DrawerFooter>
            <Button
              leftIcon={<BiTrash/>}
              variant="outline"
              mr={3}
              colorScheme="pink"
              isDisabled={!selected_item}
              onClick={() => selected_item && deleteItem(selected_item.id)}
            >
              {lang.delete}
            </Button>
            <Button onClick={onClose} ref={btn_close}>
              {lang.close}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </DrawerOverlay>
    </Drawer>
  )
}

export default History
