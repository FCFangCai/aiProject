import { Button } from "antd";

export default function EatCard(props: any) {
  const { _arguments, handlefrontTool } = props;
  const handleOnclick = (item) => {
    let content = `我要点id为${item.id}的${item.name}`;
    handlefrontTool("wm_card", content);
  };
  return (
    <div className="message-bubble">
      {_arguments.data &&
        _arguments.data.length &&
        _arguments.data.map((item, index) => {
          return (
            <div key={item.id || index}>
              菜名:{item.name},价格:{item.price}
              <Button
                onClick={() => {
                  handleOnclick(item);
                }}
              >
                购买
              </Button>
            </div>
          );
        })}
    </div>
  );
}
