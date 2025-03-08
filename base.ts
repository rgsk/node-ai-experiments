const stringValue =
  '{"role":"assistant","content":null,"tool_calls":[{"index":0,"id":"call_iwKUYiDiDWOsxoMMjlNXG89I","type":"function","function":{"name":"GOOGLESHEETS_GET_SPREADSHEET_INFO","arguments":""}}],"refusal":null}{"tool_calls":[{"index":0,"function":{"arguments":"{\\""}}]}';

console.log(JSON.parse(stringValue));
