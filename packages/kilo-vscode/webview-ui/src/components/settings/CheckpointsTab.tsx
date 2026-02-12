import { Component } from "solid-js"
import { Switch } from "@kilocode/kilo-ui/switch"
import { Card } from "@kilocode/kilo-ui/card"
import { useConfig } from "../../context/config"

const CheckpointsTab: Component = () => {
  const { config, updateConfig } = useConfig()

  return (
    <div>
      <Card>
        <Switch
          checked={config().snapshot !== false}
          onChange={(checked) => updateConfig({ snapshot: checked })}
          description="Create checkpoints before file edits so you can restore previous states"
        >
          Enable Snapshots
        </Switch>
      </Card>
    </div>
  )
}

export default CheckpointsTab
