import Vue from 'vue';
import groupItemComponent from '~/groups/components/group_item.vue';
import GroupsStore from '~/groups/stores/groups_store';
import { group1 } from './mock_data';

fdescribe('Groups Component', () => {
  let GroupItemComponent;
  let component;
  let store;
  let group;

  beforeEach((done) => {
    GroupItemComponent = Vue.extend(groupItemComponent);
    store = new GroupsStore();
    group = store.decorateGroup(group1);

    component = new GroupItemComponent({
      propsData: {
        group,
      },
    }).$mount();

    Vue.nextTick(() => {
      done();
    });
  });

  it('should render the group item', () => {
    expect(component.$el.classList.contains('group-row')).toBe(true);
    expect(component.$el.querySelector('.number-projects').textContent).toContain(group.numberProjects);
    expect(component.$el.querySelector('.number-users').textContent).toContain(group.numberUsers);
    expect(component.$el.querySelector('.group-visibility')).toBeDefined();
    expect(component.$el.querySelector('.avatar-container')).toBeDefined();
    expect(component.$el.querySelector('.title').textContent).toContain(group.name);
    expect(component.$el.querySelector('.description').textContent).toContain(group.description);
    expect(component.$el.querySelector('.edit-group')).toBeDefined();
    expect(component.$el.querySelector('.leave-group')).toBeDefined();
  });

  // TODO: check for no description class when group has no description
});
